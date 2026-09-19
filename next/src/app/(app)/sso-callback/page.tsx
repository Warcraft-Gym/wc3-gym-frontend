import type { Metadata } from "next";
import { LoginView } from "../login/LoginView";

export const metadata: Metadata = { title: "Login" };

/** Discord's consent page comes back here; the login view finishes the Clerk handshake. */
export default function SsoCallbackPage() {
  return <LoginView />;
}
