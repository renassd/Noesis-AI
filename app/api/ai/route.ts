import { NextResponse } from "next/server";

const DEFAULT_MODEL = "claude-sonnet-4-6";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AnthropicResponse = {
  content?: Array<{
    type: string;
    text?: string;
  }>;
  error?: {
    message?: string;
  };
};

function getRequestedFlashcardCount(message: string) {
  const match = message.match(/genera exactamente\s+(\d+)\s+flashcards/i);
  return match ? Number(match[1]) : 8;
}

function createMockFlashcards(sourceText: string, maxCards: number) {
  const cleaned = sourceText.replace(/\s+/g, " ").trim();
  const sentences = cleaned
    .split(/[.!?]\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const cardCount = Math.max(1, Math.min(maxCards, sentences.length || 3));

  return Array.from({ length: cardCount }, (_, index) => {
    const excerpt =
      sentences[index] ||
      cleaned.slice(index * 120, index * 120 + 140) ||
      "Este es un contenido de ejemplo para la demo local.";

    return {
      question: `Cual es la idea principal del punto ${index + 1}?`,
      answer: excerpt,
    };
  });
}

function buildMockResponse(body: {
  system?: string;
  messages?: ChatMessage[];
  max_tokens?: number;
}) {
  const lastMessage = body.messages?.[body.messages.length - 1]?.content?.trim() || "";
  const system = body.system?.toLowerCase() || "";

  if (lastMessage.includes('Formato exacto: [{"question":"...","answer":"..."},...]')) {
    const textBlock = lastMessage.split("Texto:").pop()?.trim() || lastMessage;
    const flashcards = createMockFlashcards(textBlock, getRequestedFlashcardCount(lastMessage));
    return JSON.stringify(flashcards, null, 2);
  }

  if (system.includes("tutor")) {
    return [
      `Modo demo activo. Vamos a trabajar el tema: ${lastMessage.replace("Quiero aprender sobre:", "").trim() || "tu tema"}.`,
      "Primero te doy una explicacion simple: piensa en el concepto como un sistema con partes, funciones y relaciones clave.",
      "Ahora una pregunta de comprension: como lo explicarias con tus propias palabras en una o dos frases?",
    ].join("\n\n");
  }

  if (system.includes("investigacion academica") || system.includes("escritura academica")) {
    return [
      "Modo demo activo. Esta respuesta es local para que puedas probar la interfaz sin API externa.",
      `Resumen breve de tu pedido: ${lastMessage.slice(0, 220) || "No se recibio contenido."}`,
      "Puntos sugeridos:",
      "- idea central",
      "- argumentos o hallazgos principales",
      "- limitaciones o dudas abiertas",
      "- siguiente paso recomendado",
    ].join("\n");
  }

  return [
    "Modo demo activo.",
    "La API externa no esta configurada, asi que estoy respondiendo localmente para que puedas probar la web.",
    `Tu ultimo mensaje fue: ${lastMessage.slice(0, 240) || "sin contenido"}`,
  ].join("\n\n");
}

export async function POST(req: Request) {
  let body:
    | {
        system?: string;
        messages?: ChatMessage[];
        max_tokens?: number;
      }
    | undefined;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    body = (await req.json()) as {
      system?: string;
      messages?: ChatMessage[];
      max_tokens?: number;
    };

    if (!body.messages?.length) {
      return NextResponse.json(
        { error: "La solicitud no incluye mensajes." },
        { status: 400 },
      );
    }

    if (!apiKey) {
      return NextResponse.json({ text: buildMockResponse(body), mock: true });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: body.max_tokens ?? 1000,
        system: body.system,
        messages: body.messages,
      }),
    });

    const data = (await response.json()) as AnthropicResponse;

    if (!response.ok) {
      console.error("Anthropic API error", {
        model: DEFAULT_MODEL,
        status: response.status,
        error: data.error?.message ?? "Unknown error",
      });

      return NextResponse.json(
        {
          text: buildMockResponse(body),
          mock: true,
          warning:
            data.error?.message ??
            "Anthropic no respondio correctamente. Se devolvio una respuesta local de respaldo.",
        },
        { status: 200 },
      );
    }

    const text = data.content?.map((block) => block.text || "").join("") || "";

    return NextResponse.json({ text });
  } catch (error) {
    console.error("AI route failed", {
      model: DEFAULT_MODEL,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        text: buildMockResponse(body ?? {}),
        mock: true,
        warning: "No se pudo contactar Anthropic. Se devolvio una respuesta local de respaldo.",
      },
      { status: 200 },
    );
  }
}
