/**
 * Typography configuration for Right Hand dashboard
 * Uses CSS variables from globals.css for colors and fonts
 */

export const typography = {
  // Heading styles
  h1: "font-sans text-4xl font-bold text-foreground",
  h2: "font-sans text-3xl font-semibold text-foreground",
  h3: "font-sans text-2xl font-semibold text-foreground",
  h4: "font-sans text-xl font-semibold text-foreground",
  h5: "font-sans text-lg font-semibold text-foreground",

  // Body text styles
  body: "font-sans text-base text-foreground",
  bodyLarge: "font-sans text-lg text-foreground",
  bodySmall: "font-sans text-sm text-foreground",

  // Label and caption styles
  label: "font-sans text-sm font-medium text-foreground",
  caption: "font-sans text-xs text-muted-foreground",

  // Monospace for code/data
  mono: "font-mono text-sm text-foreground",

  // Table specific typography
  tableHeader: "font-sans text-base font-medium text-muted-foreground",
  tableCell: "font-sans text-base text-foreground",
} as const;
