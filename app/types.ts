export type Flashcard = { id: string; question: string; answer: string };

export type Deck = {
  id: string;
  name: string;
  cards: Flashcard[];
  createdAt: string;
};
