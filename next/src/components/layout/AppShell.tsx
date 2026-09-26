"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icon } from "@/components/ui/Icon";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { PlayerPanel } from "@/components/player/PlayerPanel";
import { ViewAsDialog } from "@/components/layout/ViewAsDialog";
import { ClerkBridge } from "@/lib/clerk-bridge";
import { Guard } from "@/lib/guard";
import { useTheme } from "@/hooks/theme";
import type { ThemeMode } from "@/hooks/theme";
import { canSeeRole, metaOf } from "@/lib/routes";
import { useAuth } from "@/stores";
import { myProfilePath } from "@/helpers/players.mjs";
import { buildNav, isActive, phoneTabs } from "@/helpers/nav-model.mjs";
import { inAdminFrame } from "@/helpers/admin-nav.mjs";
import { cn } from "@/lib/utils";

const BAR_LINK = "text-primary-text";
const DRAWER_LINK = "block rounded px-2 py-2 text-foreground no-underline hover:bg-accent";

// Light, dark, or the operating system setting. The choice is kept in localStorage.
const THEMES: { value: ThemeMode; title: string; icon: string }[] = [
  { value: "light", title: "Light", icon: "mdi-white-balance-sunny" },
  { value: "dark", title: "Dark", icon: "mdi-weather-night" },
  { value: "system", title: "System", icon: "mdi-theme-light-dark" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { me, user, viewAs, logout, setViewAs } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const [drawer, setDrawer] = useState(false);
  // useAuth answers the signed-out server snapshot until hydration, so the account slot waits for it
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [viewAsOpen, setViewAsOpen] = useState(false);
  // view-as: an admin sees the app as a lower role; the legacy token session cannot
  const canViewAs = me?.actual_role === "admin" && !user;

  const themeIcon = THEMES.find((t) => t.value === themeMode)?.icon || "mdi-theme-light-dark";

  // the KOTH board on a stream wears the app title alone: no nav, no account, no theme
  const mode = useSearchParams().get("mode");
  const clean = path === "/koth/dashboard" && mode === "clean";
  // the nav links are drawn for a session on any route that does not opt out with meta.nav
  const showNavLinks = !!me && metaOf(path).nav !== false && !clean;
  // a link is drawn only when the session role reaches the target route's meta.role
  const canSee = (to: string) => canSeeRole(me?.role, metaOf(to.split("?")[0]).role);
  // every hat the session wears adds its links: Home and its teams, the shared pages, the admin area
  const nav = buildNav(me, canSee);
  const tabs = phoneTabs(nav);
  // an admin page sits in the admin frame; a viewed lower role never reaches one
  const adminFrame = showNavLinks && !!nav.admin && inAdminFrame(path, metaOf(path).role === "admin");
  const current = (to: string) => (isActive(to, path) ? "page" : undefined);
  const closeDrawer = () => setDrawer(false);

  const avatarUrl: string | null = me?.avatar || null; // /me already answers the CDN URL
  const initials = (me?.name || "?").slice(0, 2).toUpperCase();
  const roleLabel = me?.superadmin ? "Super Admin" : me?.role?.replace(/^./, (c: string) => c.toUpperCase());
  const identity = [me?.name, roleLabel].filter(Boolean).join(" · ");
  // a guest has no player page, so his menu item stays on /profile
  const profileTo = myProfilePath(me);
  // the banner names each seat the admin chose; a seat stored before this shape falls back to /me
  const viewAsLabel = (() => {
    const role = viewAs?.role?.replace(/^./, (c: string) => c.toUpperCase()) ?? "";
    const seats = (viewAs?.seats ?? [])
      .map((seat) => {
        const entry = me?.seasons?.find((season: { id: number }) => Number(season.id) === seat.seasonId);
        const team = seat.team ?? entry?.team?.name;
        return team && `${team} (${seat.season ?? entry?.name})`;
      })
      .filter(Boolean);
    return seats.length ? `${role} · ${seats.join(", ")}` : role;
  })();

  return (
    // the phone's tab bar is fixed over the bottom edge, so the page ends above it
    <div className={cn("flex min-h-dvh flex-col", showNavLinks && "pb-[calc(3.5rem+env(safe-area-inset-bottom))] min-[960px]:pb-0")}>
      <ClerkBridge />
      <header className="flex items-center gap-2 border-b border-border bg-surface px-2 py-1.5">
        {showNavLinks ? (
          // below 960 px the links live in the bottom tab bar and this drawer, which More opens
          <Sheet open={drawer} onOpenChange={setDrawer}>
            <SheetContent side="left" className="w-72 overflow-y-auto p-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav aria-label="All pages">
                <ul className="flex flex-col gap-1">
                  {nav.home ? <li><Link href={nav.home.to} onClick={closeDrawer} aria-current={current(nav.home.to)} className={DRAWER_LINK}>{nav.home.title}</Link></li> : null}
                  {nav.teams.length ? (
                    <li>
                      <p className="px-2 pt-3 text-xs text-muted-foreground">My Teams</p>
                      <ul>
                        {nav.teams.map((team) => (
                          <li key={team.to}><Link href={team.to} onClick={closeDrawer} aria-current={current(team.to)} className={DRAWER_LINK}>{team.title}</Link></li>
                        ))}
                      </ul>
                    </li>
                  ) : null}
                  {nav.browse.map((group) => (
                    <li key={group.title}>
                      <p className="px-2 pt-3 text-xs text-muted-foreground">{group.title}</p>
                      <ul>
                        {group.items.map((item) => (
                          <li key={item.to}><Link href={item.to} onClick={closeDrawer} aria-current={current(item.to)} className={DRAWER_LINK}>{item.title}</Link></li>
                        ))}
                      </ul>
                    </li>
                  ))}
                  {nav.admin ? (
                    <li className="mt-3 border-t border-border pt-3">
                      <Link href={nav.admin.to} onClick={closeDrawer} aria-current={current(nav.admin.to)} className={cn(DRAWER_LINK, "flex items-center gap-2")}><Icon name="mdi-cog-outline" />{nav.admin.title}</Link>
                    </li>
                  ) : null}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        ) : null}
        {/* the app title is the way home from every page, so it always points at /; truncate keeps it on one line */}
        <Link href="/" className="truncate font-heading text-lg font-bold text-foreground no-underline">WC3 Gym Dashboard</Link>
        <div className="flex-1" />
        {showNavLinks ? (
          <nav className="hidden items-center min-[960px]:flex" aria-label="Main">
            {nav.home ? <Button variant="ghost" className={BAR_LINK} nativeButton={false} render={<Link href={nav.home.to} aria-current={current(nav.home.to)} />}>{nav.home.title}</Button> : null}
            {nav.teams.length === 1 ? (
              <Button variant="ghost" className={BAR_LINK} nativeButton={false} render={<Link href={nav.teams[0].to} aria-current={current(nav.teams[0].to)} />}>My Team</Button>
            ) : nav.teams.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" className={BAR_LINK}>My Team<Icon name="mdi-chevron-down" /></Button>} />
                <DropdownMenuContent className="min-w-[220px]">
                  {nav.teams.map((team) => (
                    <DropdownMenuItem key={team.to} render={<Link href={team.to} />}>
                      <Icon name={team.captain ? "mdi-star-circle-outline" : "mdi-shield-outline"} />
                      {team.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {nav.browse.map((group) =>
              group.items.length > 1 ? (
                <DropdownMenu key={group.title}>
                  <DropdownMenuTrigger render={<Button variant="ghost" className={BAR_LINK}>{group.title}<Icon name="mdi-chevron-down" /></Button>} />
                  <DropdownMenuContent className="min-w-[180px]">
                    {group.items.map((item) => (
                      <DropdownMenuItem key={item.to} render={<Link href={item.to} />}>
                        {item.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button key={group.title} variant="ghost" className={BAR_LINK} nativeButton={false} render={<Link href={group.items[0].to} aria-current={current(group.items[0].to)} />}>{group.title}</Button>
              ),
            )}
            {nav.admin ? (
              <Button variant="ghost" className={BAR_LINK} nativeButton={false} render={<Link href={nav.admin.to} aria-current={adminFrame ? "page" : undefined} />}><Icon name="mdi-cog-outline" />{nav.admin.title}</Button>
            ) : null}
          </nav>
        ) : null}
        {/* the session menu sits outside the link tree, so a meta.nav route keeps it */}
        {hydrated && me && !clean ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={`Account menu, ${identity}`}>
                  <Avatar className="size-9">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                    <AvatarFallback className="bg-primary text-on-primary">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="font-medium">{me.name}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href={profileTo} />}><Icon name="mdi-account" />Profile</DropdownMenuItem>
              {me?.user ? <DropdownMenuItem render={<Link href="/availability" />}><Icon name="mdi-calendar-month" />Availability</DropdownMenuItem> : null}
              {canViewAs ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setViewAsOpen(true)}><Icon name="mdi-eye-outline" />View as…</DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}><Icon name="mdi-logout" />Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {/* a signed-out visitor lands on the public pages; this is his way in */}
        {hydrated && !me && !clean ? <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>Sign in</Button> : null}
        {!clean ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Theme"><Icon name={themeIcon} /></Button>} />
            <DropdownMenuContent align="end">
              {THEMES.map((t) => (
                <DropdownMenuCheckboxItem key={t.value} checked={t.value === themeMode} onClick={() => setThemeMode(t.value)}>
                  <Icon name={t.icon} />
                  {t.title}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <main id="main" className="flex-1">
        {/* w-auto, so the 8 px margin comes off the width and a phone page never scrolls sideways */}
        {viewAs ? (
          <Alert className="alert m-2 w-auto text-warning">
            <AlertDescription className="flex items-center gap-2 text-foreground">
              <span className="flex-1">Viewing as {viewAsLabel}</span>
              <Button size="sm" variant="outline" onClick={() => setViewAs(null)}>Exit</Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {viewAsOpen ? <ViewAsDialog onOpenChange={setViewAsOpen} /> : null}
        <div className={cn("mx-auto w-full px-2 py-3 md:px-4", adminFrame ? "max-w-[1520px]" : "max-w-[1280px]")}>
          {adminFrame ? (
            <AdminFrame path={path}>
              <Guard>{children}</Guard>
            </AdminFrame>
          ) : (
            <Guard>{children}</Guard>
          )}
        </div>
        {/* A player name opens the panel over the page, so nothing typed is lost: the panel slot. */}
        <PlayerPanel />
      </main>

      {/* a stream shows the brackets alone, so the clean page carries no footer link either */}
      {showNavLinks ? <BottomNav tabs={tabs} teams={nav.teams} path={path} onMore={() => setDrawer(true)} /> : null}

      {!clean ? (
        <footer className="flex justify-end px-3 py-1 text-xs">
          <Link href="/credits" className="text-muted-foreground no-underline">Credits</Link>
        </footer>
      ) : null}
    </div>
  );
}
