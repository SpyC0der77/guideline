"use client";

import { File as FileIcon, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { POPULAR_GOOGLE_FONT_FAMILIES } from "@/lib/google-fonts";
import { cn } from "@/lib/utils";

type GlyphBorderMode = "solid" | "dotted";
type DotDensity = 1 | 2 | 3 | 4;
type FontSource = "google" | "upload";

interface GoogleFontsResponse {
  fonts: string[];
}

interface FontSourceTabsProps {
  fontSource: FontSource;
  onChange: (fontSource: FontSource) => void;
}

interface GoogleFontPickerProps {
  query: string;
  results: string[];
  selectedFont: string;
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onSelect: (fontFamily: string) => void;
}

interface UploadPickerProps {
  fontFile: globalThis.File | null;
  onChange: (fontFile: globalThis.File | null) => void;
}

interface AdvancedSettingsProps {
  isOpen: boolean;
  glyphBorderMode: GlyphBorderMode;
  dotDensity: DotDensity;
  onOpenChange: (isOpen: boolean) => void;
  onGlyphBorderModeChange: (glyphBorderMode: GlyphBorderMode) => void;
  onDotDensityChange: (dotDensity: DotDensity) => void;
}

interface PreviewCardProps {
  imageUrl: string;
  isLoading: boolean;
  glyphBorderMode: GlyphBorderMode;
}

const DEFAULT_DPI = 300;
const DEFAULT_DOT_DENSITY: DotDensity = 1;
const GLYPH_BORDER_OPTIONS: Array<{
  value: GlyphBorderMode;
  label: string;
  description: string;
}> = [
  { value: "solid", label: "Solid", description: "continuous outlines" },
  { value: "dotted", label: "Dotted", description: "dotted outlines" },
];
const DOT_DENSITY_LABELS: Record<DotDensity, string> = {
  1: "Sparse",
  2: "Normal",
  3: "Dense",
  4: "Tight",
};
const SKELETON_ROWS = [
  "w-[92%]",
  "w-[76%]",
  "w-[84%]",
  "w-[71%]",
  "w-[88%]",
  "w-[81%]",
  "w-[79%]",
  "w-[86%]",
] as const;

function GuidelineMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M 5 22 C 11 22, 19 12, 19 6 C 19 2, 13 2, 11 8 C 9 14, 9 26, 17 26 C 23 26, 27 22, 27 18"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function cleanFontQuery(query: string) {
  return query.replace(/\s+/g, " ").trim();
}

function isDotDensity(value: number): value is DotDensity {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export default function GuidelinePage() {
  const [fontSource, setFontSource] = useState<FontSource>("google");
  const [googleFontQuery, setGoogleFontQuery] = useState("");
  const [googleFontResults, setGoogleFontResults] = useState<string[]>([
    ...POPULAR_GOOGLE_FONT_FAMILIES,
  ]);
  const [selectedGoogleFont, setSelectedGoogleFont] = useState("Inter");
  const [isGoogleFontsLoading, setIsGoogleFontsLoading] = useState(false);
  const [fontFile, setFontFile] = useState<globalThis.File | null>(null);
  const [glyphBorderMode, setGlyphBorderMode] = useState<GlyphBorderMode>("solid");
  const [dotDensity, setDotDensity] = useState<DotDensity>(DEFAULT_DOT_DENSITY);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);

  const imageUrl = useMemo(() => (imageBlob ? URL.createObjectURL(imageBlob) : ""), [imageBlob]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    let isCurrent = true;
    const timeout = window.setTimeout(async () => {
      setIsGoogleFontsLoading(true);

      const params = new URLSearchParams();
      const query = cleanFontQuery(googleFontQuery);
      if (query) params.set("query", query);

      const response = await fetch(`/api/google-fonts?${params.toString()}`);
      const payload = (await response.json()) as GoogleFontsResponse;

      if (isCurrent) {
        setGoogleFontResults(payload.fonts);
        setIsGoogleFontsLoading(false);
      }
    }, cleanFontQuery(googleFontQuery) ? 220 : 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [googleFontQuery]);

  function clearSheet() {
    setErrorMessage("");
    setImageBlob(null);
  }

  function handleFontSourceChange(nextFontSource: FontSource) {
    setFontSource(nextFontSource);
    clearSheet();
  }

  function handleGoogleFontSelect(fontFamily: string) {
    setSelectedGoogleFont(fontFamily);
    clearSheet();
  }

  function handleGlyphBorderModeChange(nextGlyphBorderMode: GlyphBorderMode) {
    setGlyphBorderMode(nextGlyphBorderMode);
    setImageBlob(null);
  }

  function handleDotDensityChange(nextDotDensity: DotDensity) {
    setDotDensity(nextDotDensity);
    setImageBlob(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fontSource === "google" && !selectedGoogleFont.trim()) {
      setErrorMessage("Pick a Google Font first.");
      return;
    }

    if (fontSource === "upload" && !fontFile) {
      setErrorMessage("Pop a font file in first. Any .ttf or .otf will do.");
      return;
    }

    const body = new FormData();
    body.append("fontSource", fontSource);
    body.append("dpi", String(DEFAULT_DPI));
    body.append("glyphBorderMode", glyphBorderMode);
    body.append("dotDensity", String(dotDensity));
    if (fontSource === "google") body.append("googleFontFamily", selectedGoogleFont.trim());
    if (fontSource === "upload" && fontFile) body.append("font", fontFile);

    setIsLoading(true);
    setErrorMessage("");
    setImageBlob(null);

    const response = await fetch("/api/guideline", { method: "POST", body });
    if (response.ok) {
      setImageBlob(await response.blob());
    } else {
      setErrorMessage("Unable to make that practice sheet.");
    }

    setIsLoading(false);
  }

  return (
    <main
      className="relative flex min-h-screen w-full flex-1 flex-col overflow-clip font-(family-name:--font-body-4) text-[#3a2218]"
      style={{
        background: "linear-gradient(160deg, #fff1e3 0%, #ffd9c2 45%, #f7c8d6 100%)",
      }}
    >
      <BackgroundShapes />
      <Header />

      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-10 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-center lg:gap-12">
        <div className="w-full min-w-0">
          <HeroCopy />

          <form onSubmit={handleSubmit} className="mt-10 w-full space-y-6 lg:max-w-md">
            <div className="rounded-2xl border border-[#3a2218]/18 bg-white/55 p-2 text-sm">
              <FontSourceTabs fontSource={fontSource} onChange={handleFontSourceChange} />

              {fontSource === "google" ? (
                <GoogleFontPicker
                  query={googleFontQuery}
                  results={googleFontResults}
                  selectedFont={selectedGoogleFont}
                  isLoading={isGoogleFontsLoading}
                  onQueryChange={setGoogleFontQuery}
                  onSelect={handleGoogleFontSelect}
                />
              ) : (
                <UploadPicker
                  fontFile={fontFile}
                  onChange={(nextFontFile) => {
                    setFontFile(nextFontFile);
                    setImageBlob(null);
                  }}
                />
              )}
            </div>

            <AdvancedSettings
              isOpen={isAdvancedOpen}
              glyphBorderMode={glyphBorderMode}
              dotDensity={dotDensity}
              onOpenChange={setIsAdvancedOpen}
              onGlyphBorderModeChange={handleGlyphBorderModeChange}
              onDotDensityChange={handleDotDensityChange}
            />

            {errorMessage ? (
              <p className="rounded-2xl bg-[#ffe1d6] px-4 py-2 text-sm text-[#7a2f1c]">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="group inline-flex items-center justify-center rounded-full bg-[#3a2218] px-7 py-3.5 text-sm font-semibold text-[#fff1e3] shadow-[0_10px_30px_-10px_rgba(58,34,24,0.6)] transition-transform hover:-translate-y-0.5 hover:bg-[#e07a5f] disabled:opacity-40"
            >
              <span>{isLoading ? "Setting your practice sheet..." : "Make my practice sheet"}</span>
            </button>
          </form>
        </div>

        <PreviewCard imageUrl={imageUrl} isLoading={isLoading} glyphBorderMode={glyphBorderMode} />
      </section>
    </main>
  );
}

function BackgroundShapes() {
  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-112 w-md opacity-70 blur-[1px]"
        viewBox="0 0 200 200"
      >
        <path
          fill="#ffb38a"
          d="M48.6,-58.4C61.6,-47.4,69.6,-30.7,71.7,-13.7C73.8,3.4,70,20.8,60.1,33.1C50.2,45.4,34.3,52.7,17.6,58.6C0.9,64.5,-16.7,69,-31.4,63.5C-46.1,58,-58,42.5,-64.4,25.3C-70.7,8.1,-71.6,-10.8,-64.1,-25C-56.6,-39.2,-40.7,-48.6,-25.3,-57.9C-9.9,-67.2,5.1,-76.4,19.6,-74.7C34.1,-73,49.1,-60.4,48.6,-58.4Z"
          transform="translate(100 100)"
        />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 h-136 w-136 opacity-60 blur-[2px]"
        viewBox="0 0 200 200"
      >
        <path
          fill="#f7a5b6"
          d="M40.8,-55.3C53.4,-47.5,64.3,-35.7,68.7,-21.6C73.1,-7.6,71,8.7,63.4,21.7C55.7,34.7,42.6,44.4,28.4,52C14.1,59.6,-1.2,65.1,-16.4,63.6C-31.6,62,-46.7,53.5,-55.5,40.8C-64.4,28,-67,11,-65.6,-5.5C-64.1,-21.9,-58.6,-37.9,-47.8,-46.4C-37,-54.9,-20.9,-56,-3.5,-52.1C13.9,-48.1,28.2,-63.1,40.8,-55.3Z"
          transform="translate(100 100)"
        />
      </svg>
    </>
  );
}

function Header() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center px-8 pt-10">
      <div className="flex items-center gap-3 font-(family-name:--font-display-4) text-2xl">
        <span aria-hidden className="grid size-9 place-items-center rounded-full bg-[#3a2218] text-[#fff1e3]">
          <GuidelineMark className="size-[1.35rem]" />
        </span>
        <span className="italic">Guideline</span>
      </div>
    </header>
  );
}

function HeroCopy() {
  return (
    <>
      <h1 className="font-(family-name:--font-display-4) text-[clamp(3rem,8vw,6rem)] leading-[0.95]">
        Write like a
        <br />
        <span className="font-medium italic" style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1" }}>
          font
        </span>
        <span aria-hidden className="text-[#e07a5f]">.</span>
      </h1>
      <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-[#3a2218]/75">
        Pick a typeface you wish your handwriting looked like. Guideline lays every letter and number
        onto a printable practice sheet. Trace it, day by day, until your pen catches up.
      </p>
    </>
  );
}

function FontSourceTabs({ fontSource, onChange }: FontSourceTabsProps) {
  return (
    <div className="relative grid grid-cols-2 border-b border-[#3a2218]/12">
      <span
        aria-hidden
        className={cn(
          "absolute bottom-0 left-0 h-0.5 w-1/2 bg-[#3a2218] transition-transform duration-200 ease-out motion-reduce:transition-none",
          fontSource === "upload" && "translate-x-full",
        )}
      />
      {(["google", "upload"] as const).map((source) => (
        <button
          key={source}
          type="button"
          onClick={() => onChange(source)}
          className={cn(
            "relative z-10 px-3 py-2.5 text-center font-semibold transition-colors duration-200",
            fontSource === source
              ? "text-[#3a2218]"
              : "text-[#3a2218]/55 hover:text-[#3a2218]",
          )}
          aria-pressed={fontSource === source}
        >
          {source === "google" ? "Google Fonts" : "Upload"}
        </button>
      ))}
    </div>
  );
}

function GoogleFontPicker({
  query,
  results,
  selectedFont,
  isLoading,
  onQueryChange,
  onSelect,
}: GoogleFontPickerProps) {
  const customFont = cleanFontQuery(query);
  const canUseCustomFont =
    /^[a-zA-Z0-9 ]{1,80}$/.test(customFont) &&
    !results.some((fontFamily) => fontFamily.toLowerCase() === customFont.toLowerCase());

  return (
    <div className="flex flex-col gap-3 px-2 py-4">
      <label htmlFor="google-font-search" className="font-medium text-[#3a2218]">
        Search Google Fonts
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-[#3a2218]/18 bg-white/80 px-3 py-2 focus-within:ring-2 focus-within:ring-[#e07a5f]/35">
        <Search className="size-4 shrink-0 text-[#3a2218]/55" strokeWidth={1.75} />
        <input
          id="google-font-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Try Inter, DM Sans, Arial..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#3a2218]/40"
        />
      </div>

      <div className="grid grid-cols-2 content-start gap-2">
        {canUseCustomFont ? (
          <FontButton
            className="col-span-2"
            fontFamily={`Use "${customFont}"`}
            isSelected={selectedFont === customFont}
            onClick={() => onSelect(customFont)}
          />
        ) : null}

        {results.map((fontFamily) => (
          <FontButton
            key={fontFamily}
            fontFamily={fontFamily}
            isSelected={selectedFont === fontFamily}
            onClick={() => onSelect(fontFamily)}
          />
        ))}
      </div>

      <div className="h-4">
        {isLoading ? (
          <p className="text-xs text-[#3a2218]/60">Searching Google Fonts...</p>
        ) : results.length === 0 ? (
          <p className="text-xs text-[#3a2218]/60">
            Google will check the exact family name when you make the sheet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FontButton({
  className,
  fontFamily,
  isSelected,
  onClick,
}: {
  className?: string;
  fontFamily: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-white/70 px-3 py-2 text-left transition-colors",
        isSelected
          ? "border-[#3a2218] text-[#3a2218]"
          : "border-[#3a2218]/14 text-[#3a2218]/65 hover:border-[#3a2218]/40",
        className,
      )}
    >
      <span className="block truncate font-semibold">{fontFamily}</span>
    </button>
  );
}

function UploadPicker({ fontFile, onChange }: UploadPickerProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragOver(false);
    onChange(event.dataTransfer.files[0] ?? null);
  }

  return (
    <div className="flex h-96 px-2 py-4">
      <label
        htmlFor="font-upload"
        className="block h-full w-full cursor-pointer"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <span
          className={cn(
            "group/upload relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-[#3a2218]/30 bg-white/70 px-6 py-8 text-center text-sm",
            "transition-all duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] hover:border-[#e07a5f]/85 hover:bg-white",
            !fontFile && !isDragOver && "animate-upload-zone-breathe",
            isDragOver && "scale-[1.02] border-solid border-[#e07a5f] bg-white ring-4 ring-[#e07a5f]/25",
          )}
        >
          {!fontFile ? (
            <span
              aria-hidden
              className={cn(
                "animate-upload-dash-march pointer-events-none absolute inset-0 rounded-2xl opacity-[0.08] transition-opacity duration-300 group-hover/upload:opacity-[0.16]",
                isDragOver && "opacity-30",
              )}
            />
          ) : null}
          <span
            aria-hidden
            className="relative inline-flex size-12 shrink-0 animate-whimsical-paper-float items-center justify-center rounded-xl bg-[#fff1e3] transition-transform duration-300 group-hover/upload:scale-[1.03] motion-reduce:animate-none"
          >
            <FileIcon className="size-7 text-[#3a2218]" strokeWidth={1.75} />
          </span>
          <span className="relative max-w-full truncate text-base font-semibold">
            {fontFile?.name ?? (isDragOver ? "Let go. I've got it!" : "Drop in a .ttf or .otf")}
          </span>
          <span className="relative rounded-xl bg-[#3a2218] px-3 py-1 text-xs text-[#fff1e3] shadow-sm">
            browse
          </span>
          <input
            id="font-upload"
            type="file"
            accept=".ttf,.otf,font/ttf,font/otf"
            aria-label="Choose a font file (.ttf or .otf)"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </span>
      </label>
    </div>
  );
}

function AdvancedSettings({
  isOpen,
  glyphBorderMode,
  dotDensity,
  onOpenChange,
  onGlyphBorderModeChange,
  onDotDensityChange,
}: AdvancedSettingsProps) {
  return (
    <div className="rounded-2xl border border-[#3a2218]/18 bg-white/50 px-4 py-3 text-sm">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="advanced-settings"
        onClick={() => onOpenChange(!isOpen)}
        className="flex w-full items-center justify-between gap-3 text-left font-semibold text-[#3a2218]"
      >
        <span>Advanced</span>
        <span
          aria-hidden
          className={cn("transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-180")}
        >
          v
        </span>
      </button>

      <div
        id="advanced-settings"
        aria-hidden={!isOpen}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-4 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-[#3a2218]">Glyph border</legend>
              <div className="grid grid-cols-2 gap-2">
                {GLYPH_BORDER_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "cursor-pointer rounded-2xl border bg-white/70 px-4 py-3 text-sm transition-colors",
                      "focus-within:ring-2 focus-within:ring-[#e07a5f]/45 focus-within:ring-offset-2 focus-within:ring-offset-[#fff1e3]",
                      glyphBorderMode === option.value
                        ? "border-[#3a2218] text-[#3a2218]"
                        : "border-[#3a2218]/18 text-[#3a2218]/65 hover:border-[#3a2218]/45",
                    )}
                  >
                    <input
                      type="radio"
                      name="glyph-border-mode"
                      value={option.value}
                      checked={glyphBorderMode === option.value}
                      disabled={!isOpen}
                      onChange={() => onGlyphBorderModeChange(option.value)}
                      className="sr-only"
                    />
                    <span className="block font-semibold">{option.label}</span>
                    <span className="mt-0.5 block text-xs">{option.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="dot-density" className="font-medium text-[#3a2218]">
                Dot density
              </label>
              <span className="text-xs text-[#3a2218]/60">{DOT_DENSITY_LABELS[dotDensity]}</span>
            </div>
            <input
              id="dot-density"
              type="range"
              min="1"
              max="4"
              step="1"
              value={dotDensity}
              disabled={!isOpen || glyphBorderMode !== "dotted"}
              onChange={(event) => {
                const nextDotDensity = Number.parseInt(event.target.value, 10);
                if (isDotDensity(nextDotDensity)) onDotDensityChange(nextDotDensity);
              }}
              className="w-full accent-[#3a2218] disabled:opacity-40"
            />
            <div className="flex justify-between text-xs text-[#3a2218]/55">
              <span>Sparser</span>
              <span>Denser</span>
            </div>
            <p className="text-xs leading-relaxed text-[#3a2218]/60">
              Applies only when the glyph border is set to dotted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ imageUrl, isLoading, glyphBorderMode }: PreviewCardProps) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center justify-center lg:fixed lg:top-1/2 lg:right-[max(2rem,calc((100vw-72rem)/2))] lg:w-[min(calc(50vw-3rem),32rem)] lg:-translate-y-1/2">
      <div
        className={cn(
          "relative aspect-8.5/11 w-full rounded-[28px] bg-white p-3 lg:max-w-[min(32rem,calc((100vh-11rem)*8.5/11))]",
          "shadow-[0_30px_60px_-20px_rgba(58,34,24,0.35)] ring-1 ring-[#3a2218]/4",
          "animate-practice-sheet-sway motion-reduce:animate-none",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute -top-3 left-1/2 h-6 w-24 rounded-full bg-[#fff1e3]/90 [box-shadow:inset_0_0_0_1px_rgba(58,34,24,0.15)]",
            "animate-practice-sheet-pin motion-reduce:-translate-x-1/2 motion-reduce:animate-none",
          )}
        />
        {isLoading ? <SheetSkeleton /> : imageUrl ? <SheetImage imageUrl={imageUrl} /> : <SheetPlaceholder />}
      </div>

      <p
        aria-hidden={glyphBorderMode !== "dotted"}
        className={cn(
          "mt-4 max-w-sm text-center text-xs leading-relaxed",
          glyphBorderMode === "dotted" ? "text-[#3a2218]/60" : "text-transparent",
        )}
      >
        Note: Dotted lines appear blurry on most displays. Zoom in or print it out to see them
        clearly.
      </p>

      <div className="mt-6 flex min-h-11.5 items-center justify-center">
        <a
          href={imageUrl || "#"}
          download={imageUrl ? "guideline.png" : undefined}
          onClick={(event) => {
            if (!imageUrl) event.preventDefault();
          }}
          className={cn(
            "group/dl relative inline-flex items-center gap-2 overflow-hidden rounded-full border-2 border-[#3a2218] bg-white/90 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm",
            "transition-[transform,opacity,color,background-color,border-color] duration-300",
            imageUrl && "animate-download-pill-twinkle motion-reduce:animate-none!",
            imageUrl && "hover:scale-[1.04] hover:animate-none! hover:bg-[#3a2218] hover:text-[#fff1e3]",
            !imageUrl && "pointer-events-none opacity-0",
          )}
          aria-hidden={!imageUrl}
          tabIndex={imageUrl ? undefined : -1}
        >
          <span
            aria-hidden
            className={cn("inline-block", imageUrl && "animate-download-arrow-bounce motion-reduce:animate-none!")}
          >
            v
          </span>
          <span>save &amp; print</span>
          <span
            aria-hidden
            className="pointer-events-none absolute -top-8 -left-4 size-20 rounded-full bg-[#f7c8d6]/55 blur-xl transition-opacity duration-500 group-hover/dl:opacity-60"
          />
        </a>
      </div>
    </div>
  );
}

function SheetSkeleton() {
  return (
    <div
      className="relative aspect-8.5/11 w-full overflow-hidden rounded-[20px]"
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent 0 36px, rgba(58,34,24,0.07) 36px 37px)",
        backgroundColor: "#faf5ee",
      }}
      role="status"
      aria-live="polite"
      aria-busy
      aria-label="Drawing your practice sheet"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]">
        <div
          className={cn(
            "absolute -inset-y-6 -left-1/3 w-[55%] bg-linear-to-br from-transparent via-[#fffefb]/95 to-transparent",
            "animate-practice-skeleton-shimmer opacity-[0.93] motion-reduce:animate-none",
          )}
        />
        <div aria-hidden className="absolute inset-x-10 top-[12%] h-10 rounded-full bg-[#3a2218]/6" />
        <div aria-hidden className="absolute inset-x-10 top-[34%] space-y-[22px]">
          {SKELETON_ROWS.map((lineClass) => (
            <div key={lineClass} className={cn("h-[10px] rounded-full bg-[#3a2218]/5", lineClass)} />
          ))}
        </div>
      </div>
      <p className="absolute inset-x-0 bottom-12 text-center text-sm font-medium text-[#3a2218]/45">
        Guideline is sketching your letters...
      </p>
    </div>
  );
}

function SheetImage({ imageUrl }: { imageUrl: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={imageUrl}
      src={imageUrl}
      alt="Guideline practice sheet"
      className="block h-auto w-full animate-practice-sheet-image-in rounded-[20px] brightness-[0.82] contrast-[1.85] motion-reduce:animate-none"
    />
  );
}

function SheetPlaceholder() {
  return (
    <div
      className="grid aspect-8.5/11 w-full place-items-center rounded-[20px]"
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent 0 36px, rgba(58,34,24,0.08) 36px 37px)",
        backgroundColor: "#fffaf2",
      }}
    >
      <div className="text-center">
        <div
          className={cn(
            "font-(family-name:--font-display-4) text-[7rem] leading-none text-[#e07a5f] italic",
            "animate-practice-sheet-placeholder motion-reduce:animate-none",
          )}
        >
          Aa
        </div>
        <p className="mt-2 text-sm text-[#3a2218]/60">your practice sheet appears here</p>
      </div>
    </div>
  );
}
