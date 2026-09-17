import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const ICON = {
  error: "mdi-alert-circle-outline",
  success: "mdi-check-circle-outline",
  info: "mdi-information-outline",
  warning: "mdi-alert-outline",
};
const TONE = { error: "text-error", success: "text-success", info: "text-info", warning: "text-warning" };

/** A tonal alert that holds any content and never closes. `action` sits at its end. */
export function Note({
  type = "info",
  action,
  className,
  children,
}: {
  type?: keyof typeof ICON;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  // DESIGN.md: colour never carries meaning alone, so the type draws its icon too
  return (
    <Alert className={cn("alert", TONE[type], className)}>
      <AlertDescription className="flex items-start gap-2 text-foreground">
        <Icon name={ICON[type]} className={TONE[type]} />
        <div className="flex-1">{children}</div>
        {action}
      </AlertDescription>
    </Alert>
  );
}
