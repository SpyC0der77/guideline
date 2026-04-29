import { POPULAR_GOOGLE_FONT_FAMILIES } from "@/lib/google-fonts";

const GOOGLE_FONTS_METADATA_ENDPOINT = "https://fonts.google.com/metadata/fonts";

interface GoogleFontFamilyMetadata {
  family?: string;
}

interface GoogleFontsMetadata {
  familyMetadataList?: GoogleFontFamilyMetadata[];
}

async function getGoogleFontFamilies(): Promise<string[]> {
  const response = await fetch(GOOGLE_FONTS_METADATA_ENDPOINT, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    next: {
      revalidate: 60 * 60 * 24,
    },
  });
  if (!response.ok) throw new Error("Unable to load Google Fonts metadata.");

  const text = await response.text();
  const payload = JSON.parse(text.replace(/^\)\]\}'\n?/, "")) as GoogleFontsMetadata;
  return payload.familyMetadataList?.flatMap((font) => (font.family ? [font.family] : [])) ?? [];
}

function sortFontFamilies(fontFamilies: string[], query: string): string[] {
  if (!query) return [...POPULAR_GOOGLE_FONT_FAMILIES];

  const aliasMatches = POPULAR_GOOGLE_FONT_FAMILIES.filter((fontFamily) =>
    fontFamily.toLowerCase().includes(query)
  );
  const metadataMatches = fontFamilies
    .filter((fontFamily) => fontFamily.toLowerCase().includes(query))
    .sort((first, second) => {
      const firstName = first.toLowerCase();
      const secondName = second.toLowerCase();
      const firstStartsWithQuery = firstName.startsWith(query);
      const secondStartsWithQuery = secondName.startsWith(query);

      if (firstStartsWithQuery !== secondStartsWithQuery) return firstStartsWithQuery ? -1 : 1;
      return first.localeCompare(second);
    });

  return [...new Set([...aliasMatches, ...metadataMatches])].slice(0, 12);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
    const fontFamilies = await getGoogleFontFamilies();

    return Response.json(
      {
        fonts: sortFontFamilies(fontFamilies, query),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch {
    return Response.json({ fonts: [...POPULAR_GOOGLE_FONT_FAMILIES] }, { status: 200 });
  }
}
