/**
 * Typography configuration for Right Hand dashboard
 * Uses CSS variables from globals.css for colors and fonts
 */

export const typography = {
  // Heading styles - all font-medium, moderate sizes
  h1: "font-sans text-5xl font-medium text-foreground",
  h2: "font-sans text-4xl font-medium text-foreground",
  h3: "font-sans text-3xl font-medium text-foreground",
  h4: "font-sans text-2xl font-medium text-foreground",
  h5: "font-sans text-xl font-medium text-foreground",

  // Body text styles - all font-normal, larger sizes
  body: "font-sans text-2xl font-normal text-foreground",
  bodyLarge: "font-sans text-3xl font-normal text-foreground",
  bodySmall: "font-sans text-xl font-normal text-foreground",

  // Label and caption styles
  label: "font-sans text-xl font-normal text-foreground",
  caption: "font-sans text-lg font-normal text-muted-foreground",

  // Monospace for code/data
  mono: "font-mono text-xl font-normal text-foreground",

  // Table specific typography
  tableHeader: "font-sans text-2xl font-normal text-muted-foreground",
  tableCell: "font-sans text-2xl font-normal text-foreground",
} as const;
