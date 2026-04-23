// app/api/drive/route.ts
// Google Drive integration via OAuth 2.0.
//
// SETUP REQUIRED (see README at bottom of this file):
//   1. Create a project at https://console.cloud.google.com
//   2. Enable the Google Drive API
//   3. Create OAuth 2.0 credentials (Web application)
//   4. Add to .env.local:
//        GOOGLE_CLIENT_ID=your_client_id
//        GOOGLE_CLIENT_SECRET=your_client_secret
//        NEXTAUTH_URL=http://localhost:3001   (or your production URL)
//        NEXTAUTH_SECRET=any_random_string
//
// ENDPOINTS:
//   GET  /api/drive?action=auth_url          Returns the OAuth consent URL
//   GET  /api/drive?action=callback&code=... Exchanges code for tokens, stores in cookie
//   GET  /api/drive?action=files             Lists recent Drive files (requires auth)
//   GET  /api/drive?action=file&id=...       Downloads and extracts text from a file
//   GET  /api/drive?action=logout            Clears stored tokens

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { decryptJson, encryptJson } from "@/lib/secure-token";
import { extractUploadedFile, FileExtractionError } from "@/lib/server/file-extraction";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";

// ── Config ─────────────────────────────────────────────────────────────────
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const REDIRECT_URI  = `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/api/drive?action=callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

const TOKEN_COOKIE = "noesis_drive_token";
const STATE_COOKIE = "noesis_drive_state";

// ── Helpers ─────────────────────────────────────────────────────────────────
function missingConfig() {
  return !CLIENT_ID || !CLIENT_SECRET;
}

function getStoredTokens(req: NextRequest): Record<string, string> | null {
  const cookie = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!cookie) return null;
  return decryptJson<Record<string, string>>(cookie);
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token?: string };
  return data.access_token ?? null;
}

// ── Main handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "files";

  // ── auth_url: generate OAuth consent URL ──
  if (action === "auth_url") {
    if (missingConfig()) {
      return NextResponse.json({
        error: "Google Drive not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local",
        setup: true,
      }, { status: 501 });
    }

    try {
      await requireAuthenticatedUser(req);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    const state = randomBytes(24).toString("base64url");
    url.searchParams.set("client_id",     CLIENT_ID);
    url.searchParams.set("redirect_uri",  REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope",         SCOPES.join(" "));
    url.searchParams.set("access_type",   "offline");
    url.searchParams.set("prompt",        "consent");
    url.searchParams.set("state",         state);

    const res = NextResponse.json({ url: url.toString() });
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });

    return res;
  }

  // ── callback: exchange code for tokens ──
  if (action === "callback") {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const storedState = req.cookies.get(STATE_COOKIE)?.value;
    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }
    if (!state || !storedState || state !== storedState) {
      return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[/api/drive/callback] Token exchange failed:", err);
      return NextResponse.json({ error: "Failed to exchange code for tokens" }, { status: 400 });
    }

    const tokens = await tokenRes.json();
    const res = NextResponse.redirect(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/investigacion?drive=connected`
    );
    res.cookies.set(TOKEN_COOKIE, encryptJson(tokens), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 30, // 30 days
      path:     "/",
    });
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  // ── logout: clear tokens ──
  if (action === "logout") {
    try {
      await requireAuthenticatedUser(req);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.delete(TOKEN_COOKIE);
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  // ── files: list recent Drive documents ──
  if (action === "files") {
    if (missingConfig()) {
      return NextResponse.json({ error: "Google Drive not configured", setup: true }, { status: 501 });
    }

    try {
      await requireAuthenticatedUser(req);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    let tokens = getStoredTokens(req);
    if (!tokens) {
      return NextResponse.json({ error: "Not authenticated with Google Drive", needsAuth: true }, { status: 401 });
    }

    // Refresh if needed
    if (tokens.refresh_token && !tokens.access_token) {
      const fresh = await refreshAccessToken(tokens.refresh_token);
      if (!fresh) {
        return NextResponse.json({ error: "Session expired. Please reconnect Drive.", needsAuth: true }, { status: 401 });
      }
      tokens = { ...tokens, access_token: fresh };
    }

    // Fetch files: docs, sheets, PDFs, text
    const query = [
      "mimeType='application/vnd.google-apps.document'",
      "mimeType='application/pdf'",
      "mimeType='text/plain'",
    ].join(" or ");

    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?` +
      new URLSearchParams({
        q:        `(${query}) and trashed=false`,
        fields:   "files(id,name,mimeType,modifiedTime,size)",
        orderBy:  "modifiedTime desc",
        pageSize: "20",
      }),
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    if (listRes.status === 401) {
      return NextResponse.json({ error: "Drive session expired. Please reconnect.", needsAuth: true }, { status: 401 });
    }

    if (!listRes.ok) {
      return NextResponse.json({ error: "Failed to list Drive files" }, { status: 500 });
    }

    const data = await listRes.json() as { files: unknown[] };
    return NextResponse.json({ files: data.files });
  }

  // ── file: download and extract text from a specific file ──
  if (action === "file") {
    const fileId = searchParams.get("id");
    if (!fileId) {
      return NextResponse.json({ error: "Missing file id" }, { status: 400 });
    }

    try {
      await requireAuthenticatedUser(req);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    let tokens = getStoredTokens(req);
    if (!tokens) {
      return NextResponse.json({ error: "Not authenticated with Google Drive", needsAuth: true }, { status: 401 });
    }

    if (tokens.refresh_token && !tokens.access_token) {
      const fresh = await refreshAccessToken(tokens.refresh_token);
      if (!fresh) {
        return NextResponse.json({ error: "Session expired", needsAuth: true }, { status: 401 });
      }
      tokens = { ...tokens, access_token: fresh };
    }

    // Get file metadata first
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    if (!metaRes.ok) {
      return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
    }

    const meta = await metaRes.json() as { id: string; name: string; mimeType: string };

    let text = "";

    if (meta.mimeType === "application/vnd.google-apps.document") {
      // Export Google Doc as plain text
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (!exportRes.ok) {
        return NextResponse.json({ error: "Failed to export Google Doc" }, { status: 500 });
      }
      text = await exportRes.text();

    } else if (meta.mimeType === "application/pdf") {
      // Download PDF and extract text
      const dlRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (!dlRes.ok) {
        return NextResponse.json({ error: "Failed to download PDF from Drive" }, { status: 500 });
      }
      const buffer = Buffer.from(await dlRes.arrayBuffer());
      try {
        const extracted = await extractUploadedFile(
          new File([buffer], meta.name, { type: meta.mimeType }),
        );
        text = extracted.text;
      } catch (pkgErr) {
        if (pkgErr instanceof FileExtractionError) {
          return NextResponse.json({ error: pkgErr.exposeMessage }, { status: pkgErr.status });
        }
        throw pkgErr;
      }

    } else {
      // Plain text / other — download directly
      const dlRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (!dlRes.ok) {
        return NextResponse.json({ error: "Failed to download file from Drive" }, { status: 500 });
      }
      text = await dlRes.text();
    }

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            "No readable text was found in this Drive file. If it is a scanned PDF or image-based document, try OCR first.",
        },
        { status: 422 }
      );
    }

    const MAX_CHARS = 50_000;
    const truncated = text.length > MAX_CHARS
      ? text.slice(0, MAX_CHARS) + `\n\n[... truncated at ${MAX_CHARS} characters]`
      : text;

    return NextResponse.json({
      text:  truncated.trim(),
      name:  meta.name,
      type:  meta.mimeType,
      chars: truncated.length,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/*
 * ── SETUP GUIDE ─────────────────────────────────────────────────────────────
 *
 * 1. Go to https://console.cloud.google.com
 *    - Create a new project (or select existing)
 *    - Navigate to: APIs & Services > Library
 *    - Search and enable: "Google Drive API"
 *
 * 2. Create OAuth credentials:
 *    - APIs & Services > Credentials > Create Credentials > OAuth client ID
 *    - Application type: Web application
 *    - Authorized redirect URIs: http://localhost:3001/api/drive?action=callback
 *    - (Add your production URL too when deploying)
 *    - Copy the Client ID and Client Secret
 *
 * 3. Create .env.local at the root of your project:
 *    GOOGLE_CLIENT_ID=your_client_id_here
 *    GOOGLE_CLIENT_SECRET=your_client_secret_here
 *    NEXTAUTH_URL=http://localhost:3001
 *    NEXTAUTH_SECRET=any_32_char_random_string
 *
 * 4. Install the file extraction packages:
 *    npm install pdf-parse mammoth
 *    npm install @types/pdf-parse --save-dev
 *
 * 5. The "Import from Drive" button in ImportBar will now:
 *    - On first click: redirect to Google OAuth consent screen
 *    - After auth: show a file picker with recent Drive documents
 *    - On file select: fetch and inject the text into the active editor
 *
 * ── TESTING ──────────────────────────────────────────────────────────────────
 *
 * Check if configured:
 *   curl http://localhost:3001/api/drive?action=auth_url
 *   - Returns { url: "..." }  if configured
 *   - Returns { error: "...", setup: true } if not configured
 *
 * Check uploaded files:
 *   curl -X POST http://localhost:3001/api/upload \
 *     -F "file=@/path/to/your.pdf"
 *   - Returns { text: "...", name: "your.pdf", chars: 1234 }
 */
