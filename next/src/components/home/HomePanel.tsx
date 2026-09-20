import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** One panel of the home hub: its icon, its title, an optional chip or link beside the title,
 *  and its rows. The order places it on the phone stack and inside its desktop column. */
export function HomePanel({
  icon,
  title,
  chip,
  action,
  order,
  children,
}: {
  icon: string;
  title: React.ReactNode;
  chip?: React.ReactNode;
  action?: React.ReactNode;
  order: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="card gap-0 py-0" style={{ order }}>
      <CardTitle className="flex flex-wrap items-center gap-2 bg-primary p-4 text-on-primary">
        <Icon name={icon} />
        {title}
        {chip}
        {action ? <span className="ml-auto text-sm font-normal">{action}</span> : null}
      </CardTitle>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

/** The row separator every panel list uses: a line under each row but the last. */
export const ROW = "border-b border-[rgba(var(--v-theme-on-surface),0.16)] py-2.5 last:border-b-0 last:pb-0";

/** A panel's own loading state: one skeleton bar per row it will draw. */
export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex flex-col gap-1.5">
          <Skeleton className="skeleton h-3.5 w-1/2" />
          <Skeleton className="skeleton h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** A quiet line under a panel's rows: the time zone note, the sync mark, an empty state. */
export const Quiet = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 text-sm text-muted-foreground">{children}</p>
);
