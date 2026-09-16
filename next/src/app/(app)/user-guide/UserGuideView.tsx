"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/PageHeader";
import "./markdown.css";

/** The admin guide, rendered from the markdown the page reads. */
export function UserGuideView({ htmlContent }: { htmlContent: string }) {
  return (
    <div className="p-4">
      <PageHeader title={<><Icon name="mdi-book-open-page-variant" className="mr-2" />User Guide</>} />

      <Card className="card gap-0 py-0">
        <CardHeader className="bg-primary p-4">
          <CardTitle className="flex items-center gap-2 text-on-primary">
            <Icon name="mdi-file-document" />
            <span>Documentation</span>
          </CardTitle>
        </CardHeader>

        <Separator />

        <CardContent className="p-6">
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </CardContent>
      </Card>
    </div>
  );
}

export default UserGuideView;
