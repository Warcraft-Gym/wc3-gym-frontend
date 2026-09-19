import { cn } from "@/lib/utils";

/** One Material Design Icon. The name is the `mdi-*` name the Vue app passes. */
export function Icon({ name, size, className, ...rest }: { name: string; size?: string | number } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={cn("mdi", name, className)}
      style={size ? { fontSize: typeof size === "number" ? `${size}px` : size } : undefined}
      {...rest}
    />
  );
}
