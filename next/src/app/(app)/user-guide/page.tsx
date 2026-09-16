import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { marked } from "marked";
import { headingSlug } from "@/helpers/heading-slug.mjs";
import { UserGuideView } from "./UserGuideView";

export const metadata: Metadata = { title: "User Guide" };

marked.use({
  breaks: true,
  renderer: {
    heading({ tokens, depth }) {
      return `<h${depth} id="${headingSlug(this.parser.parseInline(tokens, this.parser.textRenderer))}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    }
  }
});

// The guide is one folder over the Next app, at the repo root, and is read once at build time.
const guideMarkdown = fs.readFileSync(path.join(process.cwd(), "..", "ADMIN_UI_USER_GUIDE.md"), "utf8");
const htmlContent = marked.parse(guideMarkdown) as string;

export default function UserGuidePage() {
  return <UserGuideView htmlContent={htmlContent} />;
}
