import { backendUrl, fetchWrapper } from "@/helpers";
import { takeReturnUrl } from "@/helpers/return-url.mjs";
import { clearSession } from "@/helpers/session-keys.mjs";
import { box, useBox } from "./box";

export type Seat = { teamId: number; seasonId: number; team?: string; season?: string };
export type ViewAs = { role: string; seats?: Seat[] } | null;
export type Me = Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
// `dev` marks a local dev login; the admin-token session carries none
type User = { access_token?: string; dev?: boolean } | null;
type AuthState = { user: User; me: Me; viewAs: ViewAs; loginError: string | null };

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const read = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
};

// a captain view stored by the build before seats names no seat, so it reaches nothing; drop it
const staleView = (v: ViewAs): ViewAs => (v?.role === "captain" && !v.seats?.length ? (localStorage.removeItem("viewAs"), null) : v);

function start(): AuthState {
  if (typeof window === "undefined") return { user: null, me: null, viewAs: null, loginError: null };
  if (!localStorage.getItem("me")) localStorage.removeItem("user"); // a pre-Clerk token has no me; it would shadow the Clerk session
  // a cached me belongs to one Clerk instance; a key change (dev to production) starts clean
  if (localStorage.getItem("clerk_key") !== CLERK_KEY) {
    clearSession(); // a view-as role left behind would follow the admin into the other instance
    localStorage.setItem("clerk_key", CLERK_KEY ?? "");
  }
  return { user: read("user"), me: read("me"), viewAs: staleView(read("viewAs")), loginError: null };
}

const SIGNED_OUT: AuthState = { user: null, me: null, viewAs: null, loginError: null };
// the server renders a signed-out shell, so the first client paint matches it and React fills in after
export const authBox = box<AuthState>(start(), SIGNED_OUT);
const patch = (part: Partial<AuthState>) => authBox.set({ ...authBox.get(), ...part });

// Clerk's useAuth(), handed over by ClerkBridge where hooks are legal
let getToken: (() => Promise<string | null>) | null = null;
let signOut: (() => Promise<void>) | null = null;
let navigate: (path: string) => void = () => {};

export const useClerkAuth = (auth: { getToken: () => Promise<string | null>; signOut: () => Promise<void> }) => {
  getToken = auth.getToken;
  signOut = auth.signOut;
};
/** The shell hands the router in, so a store action can route the way `router.push` did. */
export const setNavigate = (go: (path: string) => void) => { navigate = go; };

// the legacy token wins; every other session sends the Clerk session JWT
const token = async () => authBox.get().user?.access_token || (getToken ? await getToken() : null);

const fetchMe = async (): Promise<Me> => {
  const me = await fetchWrapper.get(`${backendUrl}/me`);
  localStorage.setItem("me", JSON.stringify(me));
  patch({ me });
  return me;
};

const clear = () => {
  clearSession();
  patch({ user: null, me: null, viewAs: null });
};

const logout = async () => {
  if (!authBox.get().user) await signOut?.(); // the legacy token has no Clerk session
  clear();
  navigate("/login");
};

// the admin-token login at /admin-login; a super admin session with no Discord account. The route
// guard then leaves the page for the saved path, unless the local dev login is on: then the admin
// stays and picks between continuing and a player
const login = async (adminToken: string) => {
  const user = await fetchWrapper.post(`${backendUrl}/login`, { token: adminToken });
  localStorage.setItem("user", JSON.stringify(user));
  patch({ user });
  await fetchMe(); // /me answers the legacy token: the name, the role and the running seasons
};

// leave the /admin-login choice as the super admin
const continueAsAdmin = () => navigate(takeReturnUrl("/"));

// the local dev login: a session for one player, as the role asked for; only the admin token's session
// reaches it, and the player's token replaces it. The backend answers 404 unless it is on. The route
// guard leaves /admin-login for the saved path, as it does after every sign-in
const devLogin = async (userId: number, role: "member" | "guest" | "admin") => {
  const answer = await fetchWrapper.post(`${backendUrl}/dev/login`, { user_id: userId, role });
  const user = { access_token: answer.access_token, dev: true };
  localStorage.setItem("user", JSON.stringify(user));
  // the admin's me goes with the admin's token, so the guard waits for the player's
  patch({ user, me: null, viewAs: null });
  localStorage.removeItem("viewAs");
  await fetchMe();
};

// see the app as a lower role for debugging; null restores the admin
const setViewAs = async (viewAs: ViewAs) => {
  patch({ viewAs });
  if (viewAs) localStorage.setItem("viewAs", JSON.stringify(viewAs));
  else localStorage.removeItem("viewAs");
  await fetchMe();
  navigate(viewAs ? "/profile" : "/");
};

const setLoginError = (loginError: string | null) => patch({ loginError });

const members = ({ user, me, viewAs, loginError }: AuthState) => {
  return {
    user,
    me,
    viewAs,
    loginError,
    isAdmin: me?.role === "admin",
    // an organizer creates cups; an admin may do anything an organizer may
    isOrganizer: me?.role === "admin" || !!me?.organizer,
    isCaptain: me?.role === "captain" || me?.role === "admin",
    // a captain writes for the (team, season) pairs /me lists as seats; an admin for every pair
    isCaptainOf: (teamId: number, seasonId: number) =>
      me?.role === "admin" ||
      (me?.seats ?? []).some((seat: { team_id: number; season_id: number }) => Number(seat.team_id) === Number(teamId) && Number(seat.season_id) === Number(seasonId)),
    token,
    fetchMe,
    login,
    continueAsAdmin,
    devLogin,
    logout,
    clear,
    setViewAs,
    setLoginError,
    useClerkAuth,
  };
};

/** The members `fetch-wrapper.js` reads, plus the actions the shell calls. Not a hook. */
export const useAuthStore = () => members(authBox.get());

/** The same members, redrawn when the session changes. */
export const useAuth = () => members(useBox(authBox));
