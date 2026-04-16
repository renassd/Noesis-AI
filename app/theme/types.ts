export type ColorScheme =
  | "default"
  | "dark"
  | "sepia"
  | "forest"
  | "ocean"
  | "rose"
  | "slate";

export type FontFamily = "dmSans" | "inter" | "lora" | "sourceSerif";

export type CardStyle = "flat" | "elevated" | "glass" | "outlined" | "brutal";

export type CardRadius = "none" | "sm" | "md" | "lg" | "xl";

export type CardSize = "compact" | "default" | "large";

export type CardTemplate =
  | "clean"
  | "soft-blue"
  | "sunset"
  | "mint"
  | "lavender"
  | "midnight"
  | "paper"
  | "neon"
  | "sakura"
  | "forest";

export type CardSticker = {
  emoji: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center-top";
  size: "sm" | "md" | "lg";
};

export type CardVisual = {
  template: CardTemplate;
  frontBg: string;
  backBg: string;
  textColor: string;
  stickers: CardSticker[];
  showPattern: boolean;
  cornerAccent: "none" | "dot" | "line" | "arc";
};

export const DEFAULT_CARD_VISUAL: CardVisual = {
  template: "clean",
  frontBg: "",
  backBg: "",
  textColor: "",
  stickers: [],
  showPattern: false,
  cornerAccent: "none",
};

export type ThemePreferences = {
  colorScheme: ColorScheme;
  fontFamily: FontFamily;
  accentColor: string | null;
  cardStyle: CardStyle;
  cardRadius: CardRadius;
  cardSize: CardSize;
  cardShadowIntensity: number;
  animationsEnabled: boolean;
  cardVisual: CardVisual;
};

export const DEFAULT_THEME: ThemePreferences = {
  colorScheme: "default",
  fontFamily: "dmSans",
  accentColor: null,
  cardStyle: "elevated",
  cardRadius: "lg",
  cardSize: "default",
  cardShadowIntensity: 55,
  animationsEnabled: true,
  cardVisual: DEFAULT_CARD_VISUAL,
};
