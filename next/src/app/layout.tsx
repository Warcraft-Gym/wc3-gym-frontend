import type { Metadata } from "next";
import { Cardo, Cinzel, Inter } from "next/font/google";
import { paletteStyle, THEME_SCRIPT } from "./palette-style";
import { MEASURE_GUARD } from "./dev-measure-guard";
import "./globals.css";

// Cinzel for page titles, Cardo for headings, Inter for body text, names and every figure; Inter is variable, so each theme sets its own weight
const title = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], display: "swap", weight: ["700"] });
const heading = Cardo({ variable: "--font-cardo", subsets: ["latin"], display: "swap", weight: ["400", "700"] });
const sans = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "WC3 Gym Dashboard",
    template: "%s · WC3 Gym Dashboard",
  },
  description: "The Gym Newbie League app: seasons, series, the ladder and fantasy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${title.variable} ${heading.variable} ${sans.variable} h-full`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: paletteStyle() }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* before React loads, so its first measure already meets the guard */}
        {process.env.NODE_ENV === "development" ? <script dangerouslySetInnerHTML={{ __html: MEASURE_GUARD }} /> : null}
      </head>
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}
