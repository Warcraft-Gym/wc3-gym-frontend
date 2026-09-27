"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";

/** The admin's two ways to the stream view of a night: open it, or copy its link for OBS. A copy
 *  the browser refuses shows the link in a field, selected, so it copies by hand. */
export function StreamLinks({ eventId }: { eventId: number }) {
  const path = `/events/${eventId}?mode=clean`;
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);

  const copy = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setManual(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setManual(url);
    }
  };

  return (
    <>
      <Button nativeButton={false} size="sm" variant="outline" className="text-primary-text" render={<a href={path} target="_blank" rel="noopener" />}>
        <Icon name="mdi-monitor" />
        Open stream view
      </Button>
      <Button size="sm" variant="outline" className="text-primary-text" onClick={copy}>
        <Icon name={copied ? "mdi-check" : "mdi-content-copy"} />
        {copied ? "Copied" : "Copy stream link"}
      </Button>
      {manual ? <Input readOnly value={manual} aria-label="Stream link" className="h-8 w-full max-w-sm" autoFocus onFocus={(e) => e.currentTarget.select()} /> : null}
    </>
  );
}

export default StreamLinks;
