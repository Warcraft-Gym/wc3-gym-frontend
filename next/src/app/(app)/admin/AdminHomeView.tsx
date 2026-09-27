"use client";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { ADMIN_SECTIONS } from "@/helpers/admin-nav.mjs";

/** The admin home: every admin task, one card per section, each task a large row with a line that
 *  says what it is for. On a phone this page is the admin menu, since the sidebar is not drawn. */
export function AdminHomeView() {
  return (
    <>
      <PageHeader title="Admin" lead="Pick what you want to manage." />
      <div className="grid gap-5 min-[960px]:grid-cols-2">
        {ADMIN_SECTIONS.map((section) => (
          <Card key={section.title} className="card gap-0 py-0">
            <CardTitle className="flex items-center gap-2 banner bg-banner p-4 text-primary">
              <Icon name={section.icon} />
              <h2 className="contents">{section.title}</h2>
            </CardTitle>
            <CardContent className="p-0">
              <ul>
                {section.items.map((item) => (
                  <li key={item.to} className="border-b border-border last:border-b-0">
                    <Link href={item.to} className="flex min-h-14 items-center gap-3 px-4 py-2 text-foreground no-underline hover:bg-accent">
                      <Icon name={item.icon} className="text-xl text-primary-text" />
                      <span className="flex-1">
                        <span className="block font-medium">{item.title}</span>
                        <span className="block text-sm text-muted-foreground">{item.description}</span>
                      </span>
                      <Icon name="mdi-chevron-right" className="text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export default AdminHomeView;
