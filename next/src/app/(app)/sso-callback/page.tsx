import type { Metadata } from "next";
import { LoginView } from "../login/LoginView";

export const metadata: Metadata = { title: "Login" };

/** The backend's Discord callback comes back here with the session token; the login view takes it. */
export default function SsoCallbackPage() {
  return <LoginView />;
}
