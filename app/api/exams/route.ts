import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabase";
import { AuthError, requireAuthenticatedUser } from "../../../lib/server-auth";

export const dynamic = "force-dynamic";

// GET /api/exams — list saved exams for the current user
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("exams")
      .select("id, title, exam_type, score, questions, answers, grades, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[exams] GET error:", error);
      return NextResponse.json({ error: "Could not load exams." }, { status: 500 });
    }

    return NextResponse.json({ exams: data ?? [] });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/exams — save a completed exam
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const body = (await req.json()) as {
      title: string;
      exam_type: string;
      questions: unknown[];
      answers: Record<string, unknown>;
      grades: Record<string, unknown>;
      score: number;
    };

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("exams")
      .insert({
        user_id: user.id,
        title: body.title?.slice(0, 120) ?? "Exam",
        exam_type: body.exam_type ?? "mcq",
        questions: body.questions ?? [],
        answers: body.answers ?? {},
        grades: body.grades ?? {},
        score: body.score ?? 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[exams] POST error:", error);
      return NextResponse.json({ error: "Could not save exam." }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
