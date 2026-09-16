"use client";
import { StatusAlert } from "@/components/StatusAlert";

/** A render crash shows the shell and the message, not a blank page. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <StatusAlert modelValue={error.message || "Something went wrong."} retry={retry} />;
}
