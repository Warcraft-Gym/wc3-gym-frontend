"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { ADMIN_SECTIONS, activeAdminPath } from "@/helpers/admin-nav.mjs";
import { useAdminSidebarOpen } from "@/hooks/admin-sidebar";
import { cn } from "@/lib/utils";

/** The admin area around a page: the sidebar of sections from 960 px up, on every page an admin
 *  opens, so a season, a draft or a team keeps the way back. The admin slides it out to the left and
 *  back; this browser remembers the choice. On a phone the pages of the admin area carry a link back
 *  to the admin home, whose page lists the same sections. */
export function AdminFrame({ path, backLink, children }: { path: string; backLink: boolean; children: React.ReactNode }) {
  const active = activeAdminPath(path);
  const home = path === "/admin";
  const [open, setOpen] = useAdminSidebarOpen();

  return (
    <div className={cn("flex", open ? "gap-6" : "gap-2")}>
      <aside
        id="admin-sidebar"
        className={cn(
          "hidden shrink-0 overflow-hidden transition-[width] duration-200 motion-reduce:transition-none min-[960px]:block",
          open ? "w-60" : "w-0",
        )}
      >
        {/* a hidden sidebar takes no focus and is not read out */}
        <nav aria-label="Admin" inert={!open} aria-hidden={!open} className="sticky top-3 flex w-60 flex-col gap-4">
          <div className="flex items-center gap-1">
            <Link href="/admin" aria-current={home ? "page" : undefined} className={cn("flex flex-1 items-center gap-2 rounded px-2 py-1.5 font-heading text-lg font-bold text-foreground no-underline hover:bg-accent", home && "bg-accent")}>
              <Icon name="mdi-view-dashboard-outline" />
              Admin
            </Link>
            <Button variant="ghost" size="icon-sm" aria-label="Hide admin menu" aria-controls="admin-sidebar" aria-expanded={open} title="Hide admin menu" onClick={() => setOpen(false)}>
              <Icon name="mdi-chevron-double-left" />
            </Button>
          </div>
          {ADMIN_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-2 pb-1 text-xs uppercase tracking-wide text-muted-foreground">{section.title}</p>
              <ul>
                {section.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      href={item.to}
                      aria-current={item.to === active ? "page" : undefined}
                      className={cn("flex items-center gap-2 rounded px-2 py-1.5 text-foreground no-underline hover:bg-accent", item.to === active && "bg-accent font-medium text-primary-text")}
                    >
                      <Icon name={item.icon} />
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      {!open ? (
        // the slim tab at the left edge brings the sidebar back
        <div className="hidden shrink-0 min-[960px]:block">
          <Button
            variant="outline"
            size="icon-sm"
            className="sticky top-3"
            aria-label="Show admin menu"
            aria-controls="admin-sidebar"
            aria-expanded={open}
            title="Show admin menu"
            onClick={() => setOpen(true)}
          >
            <Icon name="mdi-chevron-double-right" />
          </Button>
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        {backLink ? (
          <Link href="/admin" className="mb-3 inline-flex min-h-10 items-center gap-1 text-primary-text no-underline min-[960px]:hidden">
            <Icon name="mdi-arrow-left" />
            Admin
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}
