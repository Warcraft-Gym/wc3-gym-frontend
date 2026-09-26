"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ADMIN_SECTIONS, activeAdminPath } from "@/helpers/admin-nav.mjs";
import { cn } from "@/lib/utils";

/** The admin area around a page: the sidebar of sections from 960 px up, and on a phone a link back
 *  to the admin home, whose page lists the same sections. The admin home itself needs neither. */
export function AdminFrame({ path, children }: { path: string; children: React.ReactNode }) {
  const active = activeAdminPath(path);
  const home = path === "/admin";

  return (
    <div className="flex gap-6">
      <aside className="hidden w-60 shrink-0 min-[960px]:block">
        <nav aria-label="Admin" className="sticky top-3 flex flex-col gap-4">
          <Link href="/admin" aria-current={home ? "page" : undefined} className={cn("flex items-center gap-2 rounded px-2 py-1.5 font-heading text-lg font-bold text-foreground no-underline hover:bg-accent", home && "bg-accent")}>
            <Icon name="mdi-view-dashboard-outline" />
            Admin
          </Link>
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
      <div className="min-w-0 flex-1">
        {home ? null : (
          <Link href="/admin" className="mb-3 inline-flex min-h-10 items-center gap-1 text-primary-text no-underline min-[960px]:hidden">
            <Icon name="mdi-arrow-left" />
            Admin
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
