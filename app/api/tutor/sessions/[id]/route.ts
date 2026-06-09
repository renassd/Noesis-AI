import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase";
import { AuthError, requireAuthenticatedUser } from "../../../../../lib/server-auth";

export const dynamic = "force-dynamic";

// DELETE /api/tutor/sessions/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("tutor_sessions")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[tutor/sessions] DELETE error:", error);
      return NextResponse.json({ error: "Could not delete session." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
