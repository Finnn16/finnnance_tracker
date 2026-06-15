import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

const CLERK_DIST_DIR = path.join(
  process.cwd(),
  "node_modules",
  "@clerk",
  "clerk-js",
  "dist",
);

const CONTENT_TYPES: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function isSafeClerkAsset(assetPath: string) {
  return /^[a-zA-Z0-9._-]+$/.test(assetPath);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: requestedPath } = await params;
  const assetPath = requestedPath.join("/");
  const extension = path.extname(assetPath);

  if (
    requestedPath.length !== 1 ||
    !isSafeClerkAsset(assetPath) ||
    !CONTENT_TYPES[extension]
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await readFile(path.join(CLERK_DIST_DIR, assetPath));

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": CONTENT_TYPES[extension],
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
