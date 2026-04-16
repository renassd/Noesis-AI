import type { CardTemplate, CardSticker } from "./types";

export interface TemplateTokens {
  label: string;
  emoji: string;
  frontBg: string;
  backBg: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
  patternSvg?: string;
}

const DOTS_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23000' opacity='.04'/%3E%3C/svg%3E")`;
const GRID_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0H0v20' fill='none' stroke='%23000' stroke-width='.4' opacity='.06'/%3E%3C/svg%3E")`;
const LINES_PATTERN = `url("data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 6L6 0' stroke='%23fff' stroke-width='.5' opacity='.12'/%3E%3C/svg%3E")`;

export const CARD_TEMPLATES: Record<CardTemplate, TemplateTokens> = {
  clean: {
    label: "Limpio",
    emoji: "C",
    frontBg: "#ffffff",
    backBg: "#f0f4ff",
    textColor: "#0d1b36",
    borderColor: "#d6e0f0",
    accentColor: "#2e63de",
  },
  "soft-blue": {
    label: "Azul suave",
    emoji: "A",
    frontBg: "linear-gradient(145deg, #e8f0ff 0%, #f0f6ff 100%)",
    backBg: "linear-gradient(145deg, #dbe8ff 0%, #e8f0ff 100%)",
    textColor: "#1a2d5a",
    borderColor: "#b8d0f5",
    accentColor: "#3b72e8",
    patternSvg: DOTS_PATTERN,
  },
  sunset: {
    label: "Atardecer",
    emoji: "S",
    frontBg: "linear-gradient(145deg, #fff1e8 0%, #ffe4d6 100%)",
    backBg: "linear-gradient(145deg, #ffe0cc 0%, #ffd0b8 100%)",
    textColor: "#3d1a0a",
    borderColor: "#f5c4a0",
    accentColor: "#e06030",
  },
  mint: {
    label: "Menta",
    emoji: "M",
    frontBg: "linear-gradient(145deg, #e8faf2 0%, #f0fdf7 100%)",
    backBg: "linear-gradient(145deg, #d4f5e5 0%, #e4f8ee 100%)",
    textColor: "#0a2e1e",
    borderColor: "#a0e0c4",
    accentColor: "#1a9060",
    patternSvg: DOTS_PATTERN,
  },
  lavender: {
    label: "Lavanda",
    emoji: "L",
    frontBg: "linear-gradient(145deg, #f5f0ff 0%, #f8f4ff 100%)",
    backBg: "linear-gradient(145deg, #ece4ff 0%, #f2ecff 100%)",
    textColor: "#2a1a4a",
    borderColor: "#d0b8f5",
    accentColor: "#7c3aed",
  },
  midnight: {
    label: "Medianoche",
    emoji: "N",
    frontBg: "linear-gradient(145deg, #0f172a 0%, #1e2d4a 100%)",
    backBg: "linear-gradient(145deg, #162035 0%, #1a2840 100%)",
    textColor: "#e2e8f8",
    borderColor: "#2a4070",
    accentColor: "#60a0ff",
    patternSvg: LINES_PATTERN,
  },
  paper: {
    label: "Papel",
    emoji: "P",
    frontBg: "linear-gradient(145deg, #fdfaf4 0%, #f8f4ec 100%)",
    backBg: "linear-gradient(145deg, #f5efe0 0%, #f0e8d4 100%)",
    textColor: "#2c1f0a",
    borderColor: "#ddd0b0",
    accentColor: "#a0703a",
    patternSvg: GRID_PATTERN,
  },
  neon: {
    label: "Neon",
    emoji: "Z",
    frontBg: "linear-gradient(145deg, #0a0a14 0%, #12121e 100%)",
    backBg: "linear-gradient(145deg, #0e0e1c 0%, #14142a 100%)",
    textColor: "#e0e8ff",
    borderColor: "#4040d0",
    accentColor: "#00e5ff",
    patternSvg: LINES_PATTERN,
  },
  sakura: {
    label: "Sakura",
    emoji: "K",
    frontBg: "linear-gradient(145deg, #fff0f5 0%, #fff5f8 100%)",
    backBg: "linear-gradient(145deg, #ffe4ee 0%, #ffecf3 100%)",
    textColor: "#3d0a1e",
    borderColor: "#f5b8cc",
    accentColor: "#e0407a",
    patternSvg: DOTS_PATTERN,
  },
  forest: {
    label: "Bosque",
    emoji: "B",
    frontBg: "linear-gradient(145deg, #0e1e14 0%, #162a1c 100%)",
    backBg: "linear-gradient(145deg, #122018 0%, #1a2e20 100%)",
    textColor: "#d4ead8",
    borderColor: "#2a4a30",
    accentColor: "#4aaf70",
    patternSvg: DOTS_PATTERN,
  },
};

export const STICKER_SETS: { label: string; emojis: string[] }[] = [
  { label: "Estudio", emojis: ["📚", "✏️", "🎓", "💡", "🧠", "📝", "🔬", "⚗️", "🧪", "📐"] },
  { label: "Energia", emojis: ["⚡", "🔥", "💪", "🚀", "⭐", "✨", "💫", "🎯", "🏆", "🌟"] },
  { label: "Naturaleza", emojis: ["🌿", "🌸", "🌊", "🌙", "☀️", "🍃", "🌺", "❄️", "🌈", "🦋"] },
  { label: "Emociones", emojis: ["😊", "🤔", "😎", "🥳", "🙌", "👏", "💯", "❤️", "💙", "🙂"] },
  { label: "Simbolos", emojis: ["✅", "❌", "⚠️", "🔑", "🎁", "💎", "🔮", "🧩", "🖝", "➕"] },
];
