import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import * as fontkit from "fontkit";

import {
  createTracingSheetPng,
  type DotDensity,
  type GlyphBorderMode,
} from "@/lib/create-tracing-sheet";

const FONT_SIZE_LIMIT = 4 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = new Set([".ttf", ".otf"]);
const GOOGLE_FONT_CSS_ENDPOINT = "https://fonts.googleapis.com/css2";
const GOOGLE_FONT_FAMILY_ALIASES = new Map([
  ["arial", "Arimo"],
  ["comic sans", "Comic Neue"],
  ["comic sans ms", "Comic Neue"],
]);

export const runtime = "nodejs";

function sanitizeFontName(input: string): string {
  const normalized = input.replace(/[^a-zA-Z0-9 _-]/g, " ").replace(/\s+/g, " ").trim();
  return normalized || "Font";
}

function parseGoogleFontFamily(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!/^[a-zA-Z0-9 ]{1,80}$/.test(normalized)) return null;
  return normalized;
}

function parseDpi(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") return 300;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 300;
  return Math.max(72, Math.min(600, parsed));
}

function parseGlyphBorderMode(value: FormDataEntryValue | null): GlyphBorderMode {
  if (value === "dotted") return "dotted";
  return "solid";
}

function parseDotDensity(value: FormDataEntryValue | null): DotDensity {
  if (typeof value !== "string") return 1;
  const parsed = Number.parseInt(value, 10);
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) return parsed;
  return 1;
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

async function getGoogleFontBuffer(fontFamily: string): Promise<{ buffer: Buffer; extension: string }> {
  const resolvedFontFamily = GOOGLE_FONT_FAMILY_ALIASES.get(fontFamily.toLowerCase()) ?? fontFamily;
  const cssUrl = new URL(GOOGLE_FONT_CSS_ENDPOINT);
  cssUrl.searchParams.set("family", `${resolvedFontFamily}:wght@400`);
  cssUrl.searchParams.set("display", "swap");

  const cssResponse = await fetch(cssUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });
  if (!cssResponse.ok) throw new Error("Unable to load Google Font CSS.");

  const css = await cssResponse.text();
  const fontUrlMatch = css.match(/url\((?:'|")?(https:\/\/fonts\.gstatic\.com\/[^)'"]+)(?:'|")?\)/);
  const fontUrl = fontUrlMatch?.[1];
  if (!fontUrl) throw new Error("Google Font file was not found.");

  const fontResponse = await fetch(fontUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });
  if (!fontResponse.ok) throw new Error("Unable to load Google Font file.");

  const extension = path.extname(new URL(fontUrl).pathname).toLowerCase() || ".woff2";
  const arrayBuffer = await fontResponse.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    extension,
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const dpi = parseDpi(formData.get("dpi"));
    const glyphBorderMode = parseGlyphBorderMode(formData.get("glyphBorderMode"));
    const dotDensity = parseDotDensity(formData.get("dotDensity"));
    const fontSource = formData.get("fontSource");
    let fontBuffer: Buffer;
    let extension: string;
    let fontDisplayName: string;

    if (fontSource === "google") {
      const googleFontFamily = parseGoogleFontFamily(formData.get("googleFontFamily"));
      if (!googleFontFamily)
        return Response.json({ error: "Choose a valid Google Font family." }, { status: 400 });

      const googleFont = await getGoogleFontBuffer(googleFontFamily);
      fontBuffer = googleFont.buffer;
      extension = googleFont.extension;
      fontDisplayName = sanitizeFontName(googleFontFamily);
    } else {
      const font = formData.get("font");
      if (!(font instanceof File))
        return Response.json({ error: "A font file is required." }, { status: 400 });

      if (font.size <= 0 || font.size > FONT_SIZE_LIMIT)
        return Response.json(
          { error: "Font file must be between 1 byte and 4 MB." },
          { status: 400 }
        );

      extension = path.extname(font.name).toLowerCase();
      if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension))
        return Response.json({ error: "Only .ttf and .otf fonts are supported." }, { status: 400 });

      const arrayBuffer = await font.arrayBuffer();
      fontBuffer = Buffer.from(arrayBuffer);
      const fallbackName = path.basename(font.name, extension);
      fontDisplayName = getDisplayNameFromBuffer(fontBuffer, fallbackName);
    }
    const fontFamily = `guideline-${randomUUID()}`;

    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "guideline-"));
    const tempFontPath = path.join(tempDirectory, `${fontFamily}${extension}`);

    try {
      await fs.writeFile(tempFontPath, fontBuffer);
      const pngBuffer = createTracingSheetPng({
        dpi,
        fontPath: tempFontPath,
        fontFamily,
        fontDisplayName,
        glyphBorderMode,
        dotDensity,
      });
      return new Response(new Uint8Array(pngBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": 'attachment; filename="guideline.png"',
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
