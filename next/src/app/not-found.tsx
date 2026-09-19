import { redirect } from "next/navigation";

/** A stale Discord or website link lands on the home page, not a blank one. */
export default function NotFound() {
  redirect("/");
}
