import type { Metadata } from "next";
import { Alegreya, Alegreya_Sans } from "next/font/google";
import { AppClerkProvider } from "@/lib/clerk-provider";
import { paletteStyle, THEME_SCRIPT } from "./palette-style";
import "./globals.css";

const display = Alegreya({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "800"],
});

const sans = Alegreya_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "GNL",
    template: "%s · GNL",
  },
  description: "The Gym Newbie League app: seasons, series, the ladder and fantasy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: paletteStyle() }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <AppClerkProvider>{children}</AppClerkProvider>
      </body>
    </html>
  );
}
