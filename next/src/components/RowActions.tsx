"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/stores";
import { cn } from "@/lib/utils";

export type RowAction = {
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  public?: boolean;
};

// Tailwind builds no class from a name held in data, so the tokens an action uses are written out.
const ACTION_COLOR: Record<string, string> = {
  error: "text-error",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  primary: "text-primary",
};

/** The buttons at the end of a row. Three or more fold into a menu.
 *  An action writes unless marked public, so only an admin sees it. */
export function RowActions({ actions, inline = false }: { actions: RowAction[]; inline?: boolean }) {
  const { isAdmin } = useAuth();
  const visible = actions.filter((a) => isAdmin || a.public);
  if (!visible.length) return null;

  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      {!inline && visible.length >= 3 ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Row actions" />}>
            <Icon name="mdi-dots-vertical" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {visible.map((action) => (
              <DropdownMenuItem
                key={action.label}
                disabled={action.disabled}
                onClick={() => action.onClick?.()}
                {...(action.href ? { render: <a href={action.href} /> } : {})}
              >
                <Icon name={action.icon} className={action.color ? ACTION_COLOR[action.color] : undefined} />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        visible.map((action) => (
          <Tooltip key={action.label}>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={action.label}
                  disabled={action.disabled || action.loading}
                  className={cn(action.color && ACTION_COLOR[action.color])}
                  onClick={() => action.onClick?.()}
                  {...(action.href ? { render: <a href={action.href} />, nativeButton: false } : {})}
                />
              }
            >
              <Icon name={action.loading ? "mdi-loading mdi-spin" : action.icon} />
            </TooltipTrigger>
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        ))
      )}
    </div>
  );
}

export default RowActions;
