"use client";

import { File } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface ApiErrorResponse {
  error?: string;
}

const DEFAULT_DPI = 300;

export default function SoftPage() {
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepth = useRef(0);
  const imageUrl = useMemo(() => (imageBlob ? URL.createObjectURL(imageBlob) : ""), [imageBlob]);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  function handleDragEnter(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragOver(false);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDragOver(false);
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    const lower = dropped.name.toLowerCase();
    if (lower.endsWith(".ttf") || lower.endsWith(".otf")) setFontFile(dropped);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fontFile) {
      setErrorMessage("Pop a font file in first — any .ttf or .otf will do.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    setImageBlob(null);
    const body = new FormData();
    body.append("font", fontFile);
    body.append("dpi", String(DEFAULT_DPI));
    try {
      const response = await fetch("/api/tracing-sheet", { method: "POST", body });
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorResponse;
        setErrorMessage(payload.error ?? "Something fizzled. Try again?");
        return;
      }
      setImageBlob(await response.blob());
    } catch {
      setErrorMessage("Couldn't reach the server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen w-full flex-1 flex-col overflow-hidden font-(family-name:--font-body-4) text-[#3a2218]"
      style={{
        background:
          "linear-gradient(160deg, #fff1e3 0%, #ffd9c2 45%, #f7c8d6 100%)",
      }}
    >
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
        className="pointer-events-none absolute -bottom-32 -right-32 h-136 w-136 opacity-60 blur-[2px]"
        viewBox="0 0 200 200"
      >
        <path
          fill="#f7a5b6"
          d="M40.8,-55.3C53.4,-47.5,64.3,-35.7,68.7,-21.6C73.1,-7.6,71,8.7,63.4,21.7C55.7,34.7,42.6,44.4,28.4,52C14.1,59.6,-1.2,65.1,-16.4,63.6C-31.6,62,-46.7,53.5,-55.5,40.8C-64.4,28,-67,11,-65.6,-5.5C-64.1,-21.9,-58.6,-37.9,-47.8,-46.4C-37,-54.9,-20.9,-56,-3.5,-52.1C13.9,-48.1,28.2,-63.1,40.8,-55.3Z"
          transform="translate(100 100)"
        />
      </svg>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center px-8 pt-10">
        <div className="flex items-center gap-3 font-(family-name:--font-display-4) text-2xl">
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-[#3a2218] text-[#fff1e3]">
            ✿
          </span>
          <span className="italic">petal</span>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 px-8 py-16 lg:grid-cols-2">
        <div>
          <h1 className="font-(family-name:--font-display-4) text-[clamp(3rem,8vw,6rem)] leading-[0.95]">
            Write like a
            <br />
            <span className="italic font-medium" style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1" }}>
              font
            </span>
            <span aria-hidden className="text-[#e07a5f]">.</span>
          </h1>
          <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-[#3a2218]/75">
            Pick a typeface you wish your handwriting looked like. Petal lays every letter and number
            onto a printable practice sheet — trace it, day by day, until your pen catches up.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 max-w-md space-y-6">
            <label
              htmlFor="font-upload"
              className="block cursor-pointer"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <span
                className={cn(
                  "group/upload relative flex items-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed border-[#3a2218]/30 bg-white/70 px-5 py-4 text-sm backdrop-blur-sm",
                  "transition-all duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)]",
                  "hover:-translate-y-1 hover:rotate-[-0.85deg] hover:border-[#e07a5f]/85 hover:bg-white hover:shadow-[0_14px_40px_-14px_oklch(0.52_0.16_32/0.35)]",
                  !fontFile && !isDragOver && "animate-upload-zone-breathe",
                  isDragOver &&
                    "scale-[1.04] -rotate-2 border-solid border-[#e07a5f] bg-white shadow-[0_28px_50px_-20px_oklch(0.48_0.15_28/0.45)] ring-4 ring-[#e07a5f]/25",
                )}
              >
                {!fontFile ? (
                  <span
                    aria-hidden
                    className={cn(
                      "animate-upload-dash-march pointer-events-none absolute inset-0 rounded-3xl opacity-[0.08] transition-opacity duration-300",
                      "group-hover/upload:opacity-[0.16]",
                      isDragOver && "opacity-30",
                    )}
                  />
                ) : null}
                <span
                  aria-hidden
                  className="relative inline-flex shrink-0 items-center justify-center transition-transform duration-300 group-hover/upload:scale-[1.03] animate-whimsical-paper-float motion-reduce:animate-none"
                >
                  <File className="size-6 text-[#3a2218]" strokeWidth={1.75} />
                </span>
                <span className="relative min-w-0 flex-1 truncate">
                  {fontFile?.name ??
                    (isDragOver ? "Let go — I’ve got it!" : "Drop in a .ttf or .otf")}
                </span>
                <span className="relative rounded-full bg-[#3a2218] px-3 py-1 text-xs text-[#fff1e3] shadow-sm">
                  browse
                </span>
                <input
                  id="font-upload"
                  type="file"
                  accept=".ttf,.otf,font/ttf,font/otf"
                  aria-label="Choose a font file (.ttf or .otf)"
                  onChange={(event) => setFontFile(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </span>
            </label>

            {errorMessage ? (
              <p className="rounded-2xl bg-[#ffe1d6] px-4 py-2 text-sm text-[#7a2f1c]">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="group inline-flex items-center gap-3 rounded-full bg-[#3a2218] px-7 py-3.5 text-sm font-semibold text-[#fff1e3] shadow-[0_10px_30px_-10px_rgba(58,34,24,0.6)] transition-transform hover:-translate-y-0.5 hover:bg-[#e07a5f] disabled:opacity-40"
            >
              <span>{isLoading ? "Setting your practice sheet…" : "Make my practice sheet"}</span>
              <span
                aria-hidden
                className="inline-block transition-transform group-hover:translate-x-1"
              >
                ✿
              </span>
            </button>
          </form>
        </div>

        <div className="relative">
          <div
            className={cn(
              "relative mx-auto w-full max-w-md rounded-[28px] bg-white p-3",
              "shadow-[0_30px_60px_-20px_rgba(58,34,24,0.35)] ring-1 ring-[#3a2218]/4",
              "animate-practice-sheet-sway motion-reduce:animate-none",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute -top-3 left-1/2 h-6 w-24 rounded-full bg-[#fff1e3]/90 [box-shadow:inset_0_0_0_1px_rgba(58,34,24,0.15)]",
                "animate-practice-sheet-pin",
                "motion-reduce:-translate-x-1/2 motion-reduce:animate-none",
              )}
            />
            {isLoading ? (
              <div
                className="relative aspect-8.5/11 w-full overflow-hidden rounded-[20px]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent 0 36px, rgba(58,34,24,0.07) 36px 37px)",
                  backgroundColor: "#faf5ee",
                }}
                role="status"
                aria-live="polite"
                aria-busy
                aria-label="Drawing your practice sheet"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]"
                >
                  <div
                    className={cn(
                      "absolute -inset-y-6 -left-1/3 w-[55%]",
                      "bg-linear-to-br from-transparent via-[#fffefb]/95 to-transparent",
                      "animate-practice-skeleton-shimmer motion-reduce:animate-none",
                      "opacity-[0.93]",
                    )}
                  />
                  <div
                    aria-hidden
                    className="absolute inset-x-10 top-[12%] h-10 rounded-full bg-[#3a2218]/6"
                  />
                  <div aria-hidden className="absolute inset-x-10 top-[34%] space-y-[22px]">
                    {(
                      [
                        "w-[92%]",
                        "w-[76%]",
                        "w-[84%]",
                        "w-[71%]",
                        "w-[88%]",
                        "w-[81%]",
                        "w-[79%]",
                        "w-[86%]",
                      ] as const
                    ).map((lineClass, idx) => (
                      <div
                        key={`skeleton-row-${idx}`}
                        className={cn(
                          "h-[10px] rounded-full bg-[#3a2218]/5",
                          lineClass,
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="absolute inset-x-0 bottom-12 text-center text-sm font-medium text-[#3a2218]/45">
                  Petal is sketching your letters…
                </p>
              </div>
            ) : imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={imageUrl}
                src={imageUrl}
                alt="Tracing sheet"
                className="animate-practice-sheet-image-in motion-reduce:animate-none block h-auto w-full rounded-[20px]"
              />
            ) : (
              <div
                className="grid aspect-8.5/11 w-full place-items-center rounded-[20px]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent 0 36px, rgba(58,34,24,0.08) 36px 37px)",
                  backgroundColor: "#fffaf2",
                }}
              >
                <div className="text-center">
                  <div
                    className={cn(
                      "font-(family-name:--font-display-4) text-[7rem] italic leading-none text-[#e07a5f]",
                      "animate-practice-sheet-placeholder motion-reduce:animate-none",
                    )}
                  >
                    Aa
                  </div>
                  <p className="mt-2 text-sm text-[#3a2218]/60">your practice sheet appears here</p>
                </div>
              </div>
            )}
          </div>
          <div
            className="mt-6 flex min-h-11.5 items-center justify-center"
          >
            <a
              href={imageUrl || "#"}
              download={imageUrl ? "tracing-sheet.png" : undefined}
              onClick={(e) => {
                if (!imageUrl) e.preventDefault();
              }}
              className={cn(
                "group/dl relative inline-flex items-center gap-2 overflow-hidden rounded-full border-2 border-[#3a2218] bg-white/90 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm",
                imageUrl &&
                  "animate-download-pill-twinkle motion-reduce:animate-none!",
                "transition-[transform,opacity,color,background-color,border-color] duration-300",
                imageUrl &&
                  "hover:scale-[1.04] hover:animate-none! hover:bg-[#3a2218] hover:text-[#fff1e3]",
                !imageUrl && "pointer-events-none opacity-0",
              )}
              aria-hidden={!imageUrl}
              tabIndex={imageUrl ? undefined : -1}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block",
                  imageUrl &&
                    "animate-download-arrow-bounce motion-reduce:animate-none!",
                )}
              >
                ⬇
              </span>
              <span>save &amp; print</span>
              <span
                aria-hidden
                className="pointer-events-none absolute -top-8 -left-4 size-20 rounded-full bg-[#f7c8d6]/55 blur-xl transition-opacity duration-500 group-hover/dl:opacity-60"
              />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
