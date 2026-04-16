import type { ColorScheme, FontFamily } from "./types";

type SchemeTokens = {
  bg: string;
  paper: string;
  surface: string;
  surfaceAlt: string;
  surfaceBlue: string;
  ink: string;
  ink2: string;
  muted: string;
  line: string;
  blue900: string;
  blue700: string;
  blue500: string;
  blue200: string;
  green: string;
  greenBg: string;
  amber: string;
  amberBg: string;
  red: string;
  redBg: string;
  cardFront: string;
  cardBack: string;
  cardBorder: string;
  cardBackBorder: string;
  shadowColor: string;
};

export const SCHEMES: Record<ColorScheme, SchemeTokens> = {
  default: {
    bg: "#f0f4ff", paper: "#fbfcff", surface: "#ffffff", surfaceAlt: "#f4f7fc", surfaceBlue: "#eaf0ff",
    ink: "#0d1b36", ink2: "#2a3a5c", muted: "#5a6880", line: "#d6e0f0",
    blue900: "#173c9b", blue700: "#2e63de", blue500: "#5b8ef5", blue200: "#c4d6fb",
    green: "#1a8060", greenBg: "#e0f4ee", amber: "#c97f20", amberBg: "#fef3e0", red: "#c0392b", redBg: "#fef0ef",
    cardFront: "#ffffff",
    cardBack: "linear-gradient(165deg, rgba(23,60,155,0.07), rgba(46,99,222,0.13))",
    cardBorder: "#d6e0f0", cardBackBorder: "#5b8ef5", shadowColor: "23,60,155",
  },
  dark: {
    bg: "#0e1117", paper: "#121722", surface: "#161b26", surfaceAlt: "#1b2230", surfaceBlue: "rgba(107,159,255,0.14)",
    ink: "#eef4ff", ink2: "#cbd6ea", muted: "#9cabc4", line: "#2a3448",
    blue900: "#6b9fff", blue700: "#7fb0ff", blue500: "#9bc2ff", blue200: "#2e436f",
    green: "#63d6a2", greenBg: "rgba(99,214,162,0.14)", amber: "#ffbc66", amberBg: "rgba(255,188,102,0.14)", red: "#ff8f8f", redBg: "rgba(255,143,143,0.14)",
    cardFront: "#151c28",
    cardBack: "linear-gradient(165deg, rgba(64,116,255,0.18), rgba(22,32,51,0.95))",
    cardBorder: "#2a3448", cardBackBorder: "#7fb0ff", shadowColor: "0,0,0",
  },
  sepia: {
    bg: "#f5efe6", paper: "#faf5ee", surface: "#fff9f2", surfaceAlt: "#f2e8da", surfaceBlue: "rgba(160,103,58,0.12)",
    ink: "#3e2f22", ink2: "#5a4634", muted: "#7a6654", line: "#dfd0bb",
    blue900: "#8a5a34", blue700: "#a0673a", blue500: "#c08758", blue200: "#e2c7a4",
    green: "#5f8a56", greenBg: "#e8f0df", amber: "#b8803c", amberBg: "#f8ead6", red: "#b85f4f", redBg: "#f7e5df",
    cardFront: "#fffaf3",
    cardBack: "linear-gradient(165deg, rgba(160,103,58,0.12), rgba(255,250,243,0.96))",
    cardBorder: "#dfd0bb", cardBackBorder: "#c08758", shadowColor: "82,54,31",
  },
  forest: {
    bg: "#0f1a14", paper: "#132119", surface: "#17281f", surfaceAlt: "#1d3127", surfaceBlue: "rgba(102,201,131,0.16)",
    ink: "#edf8f1", ink2: "#c9dfd1", muted: "#9eb8aa", line: "#294236",
    blue900: "#4abf75", blue700: "#66c983", blue500: "#8ddba6", blue200: "#315443",
    green: "#7ee0a0", greenBg: "rgba(126,224,160,0.14)", amber: "#e2bc68", amberBg: "rgba(226,188,104,0.14)", red: "#e28d7c", redBg: "rgba(226,141,124,0.14)",
    cardFront: "#17281f",
    cardBack: "linear-gradient(165deg, rgba(102,201,131,0.18), rgba(23,40,31,0.98))",
    cardBorder: "#294236", cardBackBorder: "#8ddba6", shadowColor: "0,0,0",
  },
  ocean: {
    bg: "#07111e", paper: "#0a1625", surface: "#0d1b2d", surfaceAlt: "#11253c", surfaceBlue: "rgba(72,202,228,0.14)",
    ink: "#ecf9ff", ink2: "#c6e5ef", muted: "#94b7c6", line: "#1f3952",
    blue900: "#1da9d8", blue700: "#48cae4", blue500: "#74ddf1", blue200: "#28506d",
    green: "#5fe0be", greenBg: "rgba(95,224,190,0.14)", amber: "#f3c969", amberBg: "rgba(243,201,105,0.14)", red: "#ff9d86", redBg: "rgba(255,157,134,0.14)",
    cardFront: "#0d1b2d",
    cardBack: "linear-gradient(165deg, rgba(72,202,228,0.18), rgba(13,27,45,0.98))",
    cardBorder: "#1f3952", cardBackBorder: "#74ddf1", shadowColor: "0,0,0",
  },
  rose: {
    bg: "#fdf0f3", paper: "#fff7f9", surface: "#ffffff", surfaceAlt: "#fbe6ec", surfaceBlue: "rgba(224,64,112,0.12)",
    ink: "#3a1830", ink2: "#5b2c49", muted: "#866479", line: "#ecc9d6",
    blue900: "#c92f67", blue700: "#e04070", blue500: "#ef6e95", blue200: "#f7bfd0",
    green: "#1f9a71", greenBg: "#dff6ee", amber: "#d08a3b", amberBg: "#fbead8", red: "#cf4e68", redBg: "#fde7ee",
    cardFront: "#ffffff",
    cardBack: "linear-gradient(165deg, rgba(224,64,112,0.12), rgba(255,255,255,0.96))",
    cardBorder: "#ecc9d6", cardBackBorder: "#ef6e95", shadowColor: "132,42,72",
  },
  slate: {
    bg: "#f1f3f7", paper: "#f8f9fc", surface: "#ffffff", surfaceAlt: "#eef1f6", surfaceBlue: "rgba(84,104,168,0.12)",
    ink: "#1d2435", ink2: "#39445e", muted: "#6f7890", line: "#d6dce8",
    blue900: "#43548f", blue700: "#5468a8", blue500: "#7788c4", blue200: "#cfd8ef",
    green: "#2d8f74", greenBg: "#def3ec", amber: "#c78a3d", amberBg: "#f7ead8", red: "#cf5b57", redBg: "#fdeaea",
    cardFront: "#ffffff",
    cardBack: "linear-gradient(165deg, rgba(84,104,168,0.12), rgba(255,255,255,0.96))",
    cardBorder: "#d6dce8", cardBackBorder: "#7788c4", shadowColor: "44,55,88",
  },
};

export const FONT_LABELS: Record<FontFamily, { label: string; stack: string; import: string }> = {
  dmSans: {
    label: "DM Sans",
    stack: "'DM Sans', 'Segoe UI', sans-serif",
    import: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
  },
  inter: {
    label: "Inter",
    stack: "'Inter', 'Segoe UI', sans-serif",
    import: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  lora: {
    label: "Lora",
    stack: "'Lora', Georgia, serif",
    import: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
  },
  sourceSerif: {
    label: "Source Serif",
    stack: "'Source Serif 4', Georgia, serif",
    import: "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&display=swap",
  },
};
