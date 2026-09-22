/**
 * theme.ts
 * ---------------------------------------------------------------------------
 * All colors, spacing, and sizes live here so you can restyle the whole app
 * from ONE file. Change a value below and every screen updates automatically.
 */

export const theme = {
  // ---- Backgrounds (dark space theme) ----
  bg: "#0B0E14", // app background (very dark blue)
  card: "#151A24", // cards, chat bubbles, input bar
  border: "#242C3D", // subtle borders

  // ---- Text ----
  text: "#F2F5FA", // main text (near white)
  textDim: "#9AA4B8", // secondary text (timestamps, hints)

  // ---- Brand ----
  primary: "#7C5CFF", // violet - buttons, accents
  primarySoft: "rgba(124, 92, 255, 0.18)", // translucent violet
  accent: "#39D0C4", // teal - recording / status accents

  // ---- Chat bubbles ----
  bubbleUser: "#7C5CFF", // the user's messages
  bubbleAgent: "#1C2331", // the agent's messages

  // ---- Status colors ----
  danger: "#FF5C7A", // errors
  warning: "#FFB020", // warnings

  // ---- Spacing scale (use these instead of magic numbers) ----
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,

  // ---- Shape ----
  radius: 16, // rounded corners for cards/bubbles
  radiusFull: 999, // fully round (pills, mic button)

  // ---- Type ----
  fontRegular: "System" as const, // default system font
} as const;

/** A small helper so components can spread common shadow styles. */
export const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8, // Android shadow
} as const;
