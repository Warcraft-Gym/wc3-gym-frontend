/** The top of a page: a kicker over the Title Case h1, then one lead line and the actions. */
export function PageHeader({
  kicker,
  title,
  lead,
  children,
}: {
  kicker?: string;
  title: React.ReactNode;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {kicker ? <p className="text-xs uppercase tracking-wide text-muted-foreground">{kicker}</p> : null}
      <h1>{title}</h1>
      {lead ? <p className="mt-2 text-muted-foreground">{lead}</p> : null}
      {children ? <div className="mt-4 flex flex-wrap gap-3">{children}</div> : null}
    </div>
  );
}

export default PageHeader;
