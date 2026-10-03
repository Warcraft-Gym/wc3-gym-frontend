"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";

/** Two different links of a KOTH event. "Open stream view" opens this event's clean board, the
 *  panel a stream shows. "Copy signup link" copies the stable /koth/dashboard link, which always
 *  opens the current event where players sign up, the one to post in chat. A copy the browser
 *  refuses shows the link in a field, selected, so it copies by hand. */
const SIGNUP_PATH = "/koth/dashboard";

export function StreamLinks({ eventId }: { eventId: number }) {
  const path = `/events/${eventId}?mode=clean`;
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);

  const copy = async () => {
    const url = `${window.location.origin}${SIGNUP_PATH}`;
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
      <Button nativeButton={false} size="sm" variant="outline" className="text-primary-text" title="The clean board of this event, for the stream" render={<a href={path} target="_blank" rel="noopener" />}>
        <Icon name="mdi-monitor" />
        Open stream view
      </Button>
      <Button size="sm" variant="outline" className="text-primary-text" title="The link that always opens the current KOTH event, where players sign up" onClick={copy}>
        <Icon name={copied ? "mdi-check" : "mdi-link-variant"} />
        {copied ? "Copied" : "Copy signup link"}
      </Button>
      {manual ? <Input readOnly value={manual} aria-label="Signup link" className="h-8 w-full max-w-sm" autoFocus onFocus={(e) => e.currentTarget.select()} /> : null}
    </>
  );
}

export default StreamLinks;
