import type { CardVisual } from "./theme/types";

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  visual?: Partial<CardVisual>;
};

export type Deck = {
  id: string;
  name: string;
  cards: Flashcard[];
  createdAt: string;
};
