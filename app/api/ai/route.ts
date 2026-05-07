import { NextRequest, NextResponse } from "next/server";
import {
  AiUsageError,
  finalizeAiRequestFailure,
  finalizeAiRequestSuccess,
  reserveAiRequest,
  type AiRequestReservation,
} from "@/lib/ai-usage";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";
import { searchMemories, getMemorySettings, formatMemoriesForContext } from "@/lib/memory";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
};

type AnthropicResponse = {
  content?: Array<{
    type: string;
    text?: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

type AnthropicContentBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: string;
        data: string;
      };
    };

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mediaType: match[1],
    data: match[2],
  };
}

function toAnthropicMessage(message: ChatMessage) {
  if (!message.imageDataUrl || message.role !== "user") {
    return {
      role: message.role,
      content: message.content,
    };
  }

  const parsedImage = parseDataUrl(message.imageDataUrl);
  if (!parsedImage) {
    return {
      role: message.role,
      content: message.content,
    };
  }

  const blocks: AnthropicContentBlock[] = [];

  if (message.content.trim()) {
    blocks.push({
      type: "text",
      text: message.content,
    });
  }

  blocks.push({
    type: "image",
    source: {
      type: "base64",
      media_type: parsedImage.mediaType,
      data: parsedImage.data,
    },
  });

  return {
    role: message.role,
    content: blocks,
  };
}

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
  const last = body.messages?.[body.messages.length - 1];
  const lastMessage = last?.content?.trim() || "";
  const system = body.system?.toLowerCase() || "";

  if (last?.imageDataUrl) {
    return [
      "Modo demo activo.",
      "La imagen se adjunto correctamente, pero el analisis visual real necesita la API externa configurada.",
      "Si activas ANTHROPIC_API_KEY, Claude podra leer la imagen ademas del texto.",
      `Texto adjunto: ${lastMessage || "(sin texto adicional)"}`,
    ].join("\n\n");
  }

  // Detect flashcard generation requests:
  //  a) system prompt contains "flashcard generator" — dedicated Research→FC flow
  //  b) legacy: user message contains "flashcards" + "question" + "answer" keywords
  const isFlashcardRequest =
    system.includes("flashcard generator") ||
    (/flashcards/i.test(lastMessage) && /"question"/.test(lastMessage) && /"answer"/.test(lastMessage));

  if (isFlashcardRequest) {
    let textBlock = lastMessage;

    if (system.includes("flashcard generator")) {
      // New flow: content is wrapped in <source>...</source> XML tags
      const tagged = lastMessage.match(/<source>([\s\S]*?)<\/source>/i);
      if (tagged) {
        textBlock = tagged[1].trim();
      }
      // (no tags = bare content — use lastMessage as-is, covers edge cases)
    } else {
      // Legacy flow: content follows "TEXT:" or "texto:" separator
      textBlock = lastMessage.split(/\bTEXT:\n?|\btexto:/i).pop()?.trim() || lastMessage;
    }

    const flashcards = createMockFlashcards(textBlock, 8);
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

export async function POST(req: NextRequest) {
  let body:
    | {
        system?: string;
        messages?: ChatMessage[];
        max_tokens?: number;
        useMemory?: boolean;
        memoryQuery?: string;
      }
    | undefined;
  let reservation: AiRequestReservation | null = null;

  try {
    const { user } = await requireAuthenticatedUser(req);
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(getRateLimitKey(["ai", user.id, ip]), 30, 5 * 60 * 1000);

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many AI requests. Try again in a few minutes." },
        { status: 429 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    body = (await req.json()) as {
      system?: string;
      messages?: ChatMessage[];
      max_tokens?: number;
      useMemory?: boolean;
      memoryQuery?: string;
    };

    // ── Memory injection ──────────────────────────────────────────
    // If the caller passes useMemory:true + a memoryQuery, we retrieve
    // the most relevant memories and prepend them to the system prompt.
    if (body.useMemory && body.memoryQuery?.trim()) {
      const memSettings = await getMemorySettings(user.id);
      if (memSettings.memory_enabled) {
        const memories = await searchMemories(
          user.id,
          body.memoryQuery.trim(),
          memSettings.max_context_entries,
        );
        const memBlock = formatMemoriesForContext(memories);
        if (memBlock) {
          body.system = memBlock + "\n\n" + (body.system ?? "");
        }
      }
    }
    // ─────────────────────────────────────────────────────────────

    if (!body.messages?.length) {
      return NextResponse.json(
        { error: "La solicitud no incluye mensajes." },
        { status: 400 },
      );
    }

    if (body.messages.length > 30) {
      return NextResponse.json({ error: "Demasiados mensajes en una sola solicitud." }, { status: 400 });
    }

    const totalTextChars = body.messages.reduce((sum, message) => sum + (message.content?.length ?? 0), 0);
    if (totalTextChars > 20_000) {
      return NextResponse.json({ error: "El contenido enviado es demasiado grande." }, { status: 413 });
    }

    if ((body.system?.length ?? 0) > 8_000) {
      return NextResponse.json({ error: "El prompt del sistema es demasiado grande." }, { status: 400 });
    }

    const hasOversizedImage = body.messages.some(
      (message) => (message.imageDataUrl?.length ?? 0) > 5_000_000,
    );

    if (hasOversizedImage) {
      return NextResponse.json({ error: "La imagen adjunta es demasiado grande." }, { status: 413 });
    }

    const latestUserMessage = [...body.messages]
      .reverse()
      .find((message) => message.role === "user");
    const latestInputChars = latestUserMessage?.content?.trim().length ?? 0;

    reservation = await reserveAiRequest({
      userId: user.id,
      requestedMaxTokens: body.max_tokens,
      inputChars: latestInputChars,
    });

    if (!apiKey) {
      const usage = await finalizeAiRequestSuccess({
        userId: user.id,
        eventId: reservation.eventId,
        creditsUsed: 1,
        model: reservation.model,
      });

      return NextResponse.json({
        text: buildMockResponse(body),
        mock: true,
        usage,
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: reservation.model,
        max_tokens: reservation.maxTokens,
        system: body.system,
        messages: body.messages.map(toAnthropicMessage),
      }),
    });

    const data = (await response.json()) as AnthropicResponse;

    if (!response.ok) {
      console.error("Anthropic API error", {
        model: reservation.model,
        status: response.status,
        error: data.error?.message ?? "Unknown error",
      });

      await finalizeAiRequestFailure({
        eventId: reservation.eventId,
        reason: data.error?.message ?? `Anthropic ${response.status}`,
      });

      return NextResponse.json(
        {
          text: buildMockResponse(body),
          mock: true,
          warning:
            data.error?.message ??
            "Anthropic no respondio correctamente. Se devolvio una respuesta local de respaldo.",
          usage: reservation.usage,
        },
        { status: 200 },
      );
    }

    const text = data.content?.map((block) => block.text || "").join("") || "";
    const usage = await finalizeAiRequestSuccess({
      userId: user.id,
      eventId: reservation.eventId,
      creditsUsed: 1,
      model: reservation.model,
    });

    return NextResponse.json({ text, usage });
  } catch (error) {
    if (reservation) {
      await finalizeAiRequestFailure({
        eventId: reservation.eventId,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof AiUsageError) {
      return NextResponse.json(
        {
          error: error.message,
          usage: error.usage,
        },
        { status: error.status },
      );
    }

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("AI route failed", {
      model: reservation?.model ?? "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        text: buildMockResponse(body ?? {}),
        mock: true,
        warning: "No se pudo contactar Anthropic. Se devolvio una respuesta local de respaldo.",
        usage: reservation?.usage,
      },
      { status: 200 },
    );
  }
}
