import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// POST /api/research-pdf — save extracted PDF text to DB for the authenticated user
export async function POST(req: NextRequest) {
  let userId: string;
  try {
    const { user } = await requireAuthenticatedUser(req);
    userId = user.id;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  let body: { file_name?: string; extracted_text?: string } | undefined;
  try {
    body = (await req.json()) as { file_name?: string; extracted_text?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const fileName = body?.file_name?.trim();
  const extractedText = body?.extracted_text?.trim();

  if (!fileName || !extractedText) {
    return NextResponse.json({ error: "file_name and extracted_text are required." }, { status: 400 });
  }

  if (fileName.length > 255) {
    return NextResponse.json({ error: "File name too long." }, { status: 400 });
  }

  if (extractedText.length > 100_000) {
    return NextResponse.json({ error: "Extracted text exceeds limit." }, { status: 413 });
  }

  const { data, error } = await supabase
    .from("research_pdfs")
    .insert({ user_id: userId, file_name: fileName, extracted_text: extractedText })
    .select("id, file_name, created_at")
    .single();

  if (error) {
    console.error("[/api/research-pdf] Insert failed:", error.message);
    return NextResponse.json({ error: "Could not save PDF record." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, file_name: data.file_name, created_at: data.created_at });
}

// GET /api/research-pdf — list recent PDFs for the authenticated user
export async function GET(req: NextRequest) {
  let userId: string;
  try {
    const { user } = await requireAuthenticatedUser(req);
    userId = user.id;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("research_pdfs")
    .select("id, file_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[/api/research-pdf] Select failed:", error.message);
    return NextResponse.json({ error: "Could not fetch PDF records." }, { status: 500 });
  }

  return NextResponse.json({ pdfs: data });
}
