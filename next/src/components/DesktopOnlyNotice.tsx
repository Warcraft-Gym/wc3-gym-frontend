"use client";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { SM_AND_DOWN, useBreakpoint } from "@/hooks/breakpoint";

/** The one notice a task shows on a phone when it is easier on a computer. `desktopOnly` hides the
 *  task below 960 px ("Desktop only"); without it the notice stands above the children, which stay
 *  readable ("Read on phone"). Above 960 px the children show alone. */
export function DesktopOnlyNotice({ task, desktopOnly = false, children }: { task: string; desktopOnly?: boolean; children?: React.ReactNode }) {
  const phone = useBreakpoint(SM_AND_DOWN);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (!phone) return <>{children}</>;
  return (
    <>
      <Alert className="alert mb-4">
        <AlertDescription className="flex flex-col gap-3 text-foreground">
          <span className="flex items-start gap-2">
            <Icon name="mdi-monitor" className="text-xl" />
            <span>{task} is easier on a computer. Open this page in a browser on your computer to do it.</span>
          </span>
          <Button variant="outline" size="sm" className="self-start" onClick={copy}>
            <Icon name={copied ? "mdi-check" : "mdi-link-variant"} />
            {copied ? "Link copied" : "Copy link"}
          </Button>
        </AlertDescription>
      </Alert>
      {desktopOnly ? null : children}
    </>
  );
}
