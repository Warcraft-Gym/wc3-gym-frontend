// Vuetify's tonal chip: the theme token as the text over a 12% wash of itself.
const TONE: Record<string, string> = {
  primary: "bg-primary/12 text-primary-text",
  secondary: "bg-secondary/12 text-secondary",
  success: "bg-success/12 text-success",
  info: "bg-info/12 text-info",
  warning: "bg-warning/12 text-warning",
  error: "bg-error/12 text-error",
  draw: "bg-draw/12 text-draw",
};

/** The classes a tonal chip wears for one theme token; a chip with no colour stays neutral. */
export const toneClass = (color?: string | null) => TONE[color ?? ""] ?? "bg-muted text-foreground";
