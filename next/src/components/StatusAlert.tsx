"use client";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const ICON = {
  error: "mdi-alert-circle-outline",
  success: "mdi-check-circle-outline",
  info: "mdi-information-outline",
  warning: "mdi-alert-outline",
};

/** A load or save message. It offers a retry when the page can load again. */
export function StatusAlert({
  modelValue,
  type = "error",
  retry,
  onClose,
  closable = true,
  className,
}: {
  modelValue?: string | null;
  type?: "error" | "success" | "info" | "warning";
  retry?: (() => void) | null;
  onClose?: () => void;
  /** An alert that reads a live state passes false, so the page state stays visible */
  closable?: boolean;
  className?: string;
}) {
  // An alert with no retry clears itself, as StatusAlert.vue does, so a caller need pass no handler
  // dismissedMessage holds the message that was closed, so a later, different message still shows
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  // DESIGN.md: colour never carries meaning alone, so the type draws its icon too
  if (!modelValue || modelValue === dismissedMessage) return null;
  const tone = type === "error" ? "text-error" : type === "success" ? "text-success" : type === "warning" ? "text-warning" : "text-info";
  return (
    <Alert className={cn("alert mb-4", tone, className)}>
      <AlertDescription className="text-foreground">
        <div className="flex items-start gap-2">
          <Icon name={ICON[type]} className={tone} />
          <span className="flex-1">{modelValue}</span>
          {!retry && closable ? (
            <Button variant="ghost" size="sm" aria-label="Close" onClick={() => (onClose ? onClose() : setDismissedMessage(modelValue))}>
              ×
            </Button>
          ) : null}
        </div>
        {/* A page that can read itself again offers the action its message names */}
        {retry ? (
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

export default StatusAlert;
