import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
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

interface ResolvedFont {
  buffer: Buffer;
  displayName: string;
  extension: string;
}

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const font = await resolveFont(formData);
  if (font instanceof Response) return font;

  const fontFamily = `guideline-${randomUUID()}`;
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "guideline-"));
  const tempFontPath = path.join(tempDirectory, `${fontFamily}${font.extension}`);

  try {
    await fs.writeFile(tempFontPath, font.buffer);

    const pngBuffer = createTracingSheetPng({
      dpi: parseDpi(formData.get("dpi")),
      fontPath: tempFontPath,
      fontFamily,
      fontDisplayName: font.displayName,
      glyphBorderMode: parseGlyphBorderMode(formData.get("glyphBorderMode")),
      dotDensity: parseDotDensity(formData.get("dotDensity")),
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
}

async function resolveFont(formData: FormData): Promise<ResolvedFont | Response> {
  if (formData.get("fontSource") === "google") {
    const fontFamily = parseGoogleFontFamily(formData.get("googleFontFamily"));
    if (!fontFamily)
      return Response.json({ error: "Choose a valid Google Font family." }, { status: 400 });

    const font = await getGoogleFont(fontFamily);
    return {
      ...font,
      displayName: sanitizeFontName(fontFamily),
    };
  }

  const font = formData.get("font");
  if (!(font instanceof File))
    return Response.json({ error: "A font file is required." }, { status: 400 });

  if (font.size <= 0 || font.size > FONT_SIZE_LIMIT)
    return Response.json({ error: "Font file must be between 1 byte and 4 MB." }, { status: 400 });

  const extension = path.extname(font.name).toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension))
    return Response.json({ error: "Only .ttf and .otf fonts are supported." }, { status: 400 });

  const buffer = Buffer.from(await font.arrayBuffer());
  return {
    buffer,
    extension,
    displayName: getDisplayName(buffer, path.basename(font.name, extension)),
  };
}

function parseGoogleFontFamily(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;

  const fontFamily = value.replace(/\s+/g, " ").trim();
  return /^[a-zA-Z0-9 ]{1,80}$/.test(fontFamily) ? fontFamily : null;
}

function parseDpi(value: FormDataEntryValue | null): number {
  const dpi = typeof value === "string" ? Number.parseInt(value, 10) : 300;
  return Number.isFinite(dpi) ? Math.max(72, Math.min(600, dpi)) : 300;
}

function parseGlyphBorderMode(value: FormDataEntryValue | null): GlyphBorderMode {
  return value === "dotted" ? "dotted" : "solid";
}

function parseDotDensity(value: FormDataEntryValue | null): DotDensity {
  const dotDensity = typeof value === "string" ? Number.parseInt(value, 10) : 1;
  return dotDensity === 1 || dotDensity === 2 || dotDensity === 3 || dotDensity === 4 ? dotDensity : 1;
}

function sanitizeFontName(input: string) {
  return input.replace(/[^a-zA-Z0-9 _-]/g, " ").replace(/\s+/g, " ").trim() || "Font";
}

function getDisplayName(buffer: Buffer, fallback: string) {
  try {
    const parsed = fontkit.create(buffer);
    if ("fonts" in parsed && Array.isArray(parsed.fonts)) return sanitizeFontName(parsed.fonts[0]?.fullName ?? fallback);
    if ("fullName" in parsed) return sanitizeFontName(parsed.fullName ?? fallback);
  } catch {
    // Fall through to the filename when fontkit cannot read the display name.
  }
  return sanitizeFontName(fallback);
}

async function getGoogleFont(fontFamily: string): Promise<Omit<ResolvedFont, "displayName">> {
  const resolvedFontFamily = GOOGLE_FONT_FAMILY_ALIASES.get(fontFamily.toLowerCase()) ?? fontFamily;
  const cssUrl = new URL(GOOGLE_FONT_CSS_ENDPOINT);
  cssUrl.searchParams.set("family", `${resolvedFontFamily}:wght@400`);
  cssUrl.searchParams.set("display", "swap");

  const cssResponse = await fetch(cssUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const css = await cssResponse.text();
  const fontUrl = css.match(/url\((?:'|")?(https:\/\/fonts\.gstatic\.com\/[^)'"]+)(?:'|")?\)/)?.[1];
  if (!fontUrl) throw new Error("Google Font file was not found.");

  const fontResponse = await fetch(fontUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const buffer = Buffer.from(await fontResponse.arrayBuffer());

  return {
    buffer,
    extension: path.extname(new URL(fontUrl).pathname).toLowerCase() || ".woff2",
  };
}
