import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";
import { extractUploadedFile, FileExtractionError } from "@/lib/server/file-extraction";

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() || "unknown";

  // Require a valid session — anonymous uploads open unlimited CPU-bound OCR pipelines
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

  const rateLimit = checkRateLimit(getRateLimitKey(["upload", userId, ip]), 20, 5 * 60 * 1000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Try again in a few minutes." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const result = await extractUploadedFile(file);

    return NextResponse.json({
      text: result.text,
      name: file.name,
      type: result.detectedMime,
      size: file.size,
      chars: result.text.length,
      usedOcr: result.usedOcr,
      warning: result.warning,
      previewUrl: result.previewUrl ?? null,
    });
  } catch (error) {
    console.error("[/api/upload] Error processing file:", error);

    if (error instanceof FileExtractionError) {
      return NextResponse.json({ error: error.exposeMessage }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: "Este archivo no contiene texto seleccionable. Proba subir un PDF editable o una imagen mas clara.",
      },
      { status: 500 },
    );
  }
}

export const config = {
  api: { bodyParser: false },
};
