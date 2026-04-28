"use client";

import { useEffect, useMemo, useState } from "react";

interface ApiErrorResponse {
  error?: string;
}

const DEFAULT_DPI = 300;

export default function SoftPage() {
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const imageUrl = useMemo(() => (imageBlob ? URL.createObjectURL(imageBlob) : ""), [imageBlob]);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fontFile) {
      setErrorMessage("Pop a font file in first — any .ttf or .otf will do.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
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
            <label className="block">
              <span
                className="flex items-center gap-3 rounded-3xl border-2 border-dashed border-[#3a2218]/30 bg-white/70 px-5 py-4 text-sm backdrop-blur-sm transition-colors hover:border-[#e07a5f] hover:bg-white"
              >
                <span aria-hidden className="text-2xl">📄</span>
                <span className="flex-1 truncate">
                  {fontFile?.name ?? "Drop in a .ttf or .otf"}
                </span>
                <span className="rounded-full bg-[#3a2218] px-3 py-1 text-xs text-[#fff1e3]">browse</span>
                <input
                  type="file"
                  accept=".ttf,.otf,font/ttf,font/otf"
                  aria-label="Choose a font file (.ttf or .otf)"
                  onChange={(event) => setFontFile(event.target.files?.[0] ?? null)}
                  className="absolute size-0 opacity-0"
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
            className="relative mx-auto w-full max-w-md rotate-[1.5deg] rounded-[28px] bg-white p-3 shadow-[0_30px_60px_-20px_rgba(58,34,24,0.35)]"
          >
            <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-[#fff1e3]/90 [box-shadow:inset_0_0_0_1px_rgba(58,34,24,0.15)]" />
            {imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imageUrl} alt="Tracing sheet" className="block h-auto w-full rounded-[20px]" />
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
                  <div className="font-(family-name:--font-display-4) text-[7rem] italic leading-none text-[#e07a5f]">
                    Aa
                  </div>
                  <p className="mt-2 text-sm text-[#3a2218]/60">your practice sheet appears here</p>
                </div>
              </div>
            )}
          </div>
          {imageUrl ? (
            <div className="mt-6 flex justify-center">
              <a
                href={imageUrl}
                download="tracing-sheet.png"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#3a2218] bg-white/70 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-[#3a2218] hover:text-[#fff1e3]"
              >
                <span aria-hidden>⬇</span>
                <span>save &amp; print</span>
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
