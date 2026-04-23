import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL("/api/drive", request.url);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  url.searchParams.set("action", "callback");

  return NextResponse.redirect(url);
}
