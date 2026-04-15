import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "Error de Anthropic" }, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    console.error("/api/ai error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}