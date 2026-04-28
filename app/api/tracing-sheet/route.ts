import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import * as fontkit from "fontkit";

import { createTracingSheetPng } from "@/lib/create-tracing-sheet";

const FONT_SIZE_LIMIT = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".ttf", ".otf"]);

export const runtime = "nodejs";

function sanitizeFontName(input: string): string {
  const normalized = input.replace(/[^a-zA-Z0-9 _-]/g, " ").replace(/\s+/g, " ").trim();
  return normalized || "Tracing Font";
}

function parseDpi(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") return 300;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 300;
  return Math.max(72, Math.min(600, parsed));
}

function getDisplayNameFromBuffer(buffer: Buffer, fallback: string): string {
  try {
    const parsed = fontkit.create(buffer);
    if ("fonts" in parsed && Array.isArray(parsed.fonts) && parsed.fonts.length > 0) {
      const firstFont = parsed.fonts[0];
      if (firstFont.fullName) return sanitizeFontName(firstFont.fullName);
    }
    if ("fullName" in parsed && parsed.fullName) return sanitizeFontName(parsed.fullName);
  } catch {
    return sanitizeFontName(fallback);
  }
  return sanitizeFontName(fallback);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const font = formData.get("font");
    if (!(font instanceof File))
      return Response.json({ error: "A font file is required." }, { status: 400 });

    if (font.size <= 0 || font.size > FONT_SIZE_LIMIT)
      return Response.json(
        { error: "Font file must be between 1 byte and 4 MB." },
        { status: 400 }
      );

    const extension = path.extname(font.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension))
      return Response.json({ error: "Only .ttf and .otf fonts are supported." }, { status: 400 });

    const dpi = parseDpi(formData.get("dpi"));
    const arrayBuffer = await font.arrayBuffer();
    const fontBuffer = Buffer.from(arrayBuffer);
    const fallbackName = path.basename(font.name, extension);
    const fontDisplayName = getDisplayNameFromBuffer(fontBuffer, fallbackName);
    const fontFamily = `tracing-sheet-${randomUUID()}`;

    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "tracing-sheet-"));
    const tempFontPath = path.join(tempDirectory, `${fontFamily}${extension}`);

    try {
      await fs.writeFile(tempFontPath, fontBuffer);
      const pngBuffer = createTracingSheetPng({
        dpi,
        fontPath: tempFontPath,
        fontFamily,
        fontDisplayName,
      });
      return new Response(new Uint8Array(pngBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": 'attachment; filename="tracing-sheet.png"',
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await fs.rm(tempDirectory, { recursive: true, force: true });
    }
  } catch {
    return Response.json(
      { error: "Unable to generate tracing sheet from the provided font." },
      { status: 500 }
    );
  }
}
