import { GlobalFonts, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

interface TracingSheetOptions {
  dpi: number;
  fontPath: string;
  fontFamily: string;
  fontDisplayName: string;
}

interface GlyphMetrics {
  left: number;
  right: number;
}

function clampDpi(dpi: number): number {
  if (!Number.isFinite(dpi)) return 300;
  return Math.max(72, Math.min(600, Math.round(dpi)));
}

function getGlyphMetrics(context: SKRSContext2D, text: string): GlyphMetrics {
  const metrics = context.measureText(text);
  const left = metrics.actualBoundingBoxLeft ?? 0;
  const right = metrics.actualBoundingBoxRight ?? metrics.width;
  return {
    left,
    right,
  };
}

function drawOutlinedGlyph(
  context: SKRSContext2D,
  glyph: string,
  x: number,
  y: number,
  strokeWidth: number
): void {
  context.lineWidth = strokeWidth;
  context.strokeStyle = "rgb(150, 150, 150)";
  context.fillStyle = "rgb(255, 255, 255)";
  context.strokeText(glyph, x, y);
  context.fillText(glyph, x, y);
}

export function createTracingSheetPng({
  dpi,
  fontPath,
  fontFamily,
  fontDisplayName,
}: TracingSheetOptions): Buffer {
  const safeDpi = clampDpi(dpi);
  GlobalFonts.registerFromPath(fontPath, fontFamily);

  const pageWidth = Math.floor(8.5 * safeDpi);
  const pageHeight = Math.floor(11 * safeDpi);
  const canvas = createCanvas(pageWidth, pageHeight);
  const context = canvas.getContext("2d");

  context.fillStyle = "white";
  context.fillRect(0, 0, pageWidth, pageHeight);

  const margin = Math.floor(safeDpi * 0.25);
  let y = margin;

  const headerSize = Math.floor(safeDpi * 0.45);
  context.font = `${headerSize}px "${fontFamily}"`;
  context.fillStyle = "black";
  const header = `${fontDisplayName} · Guideline`;
  const headerWidth = context.measureText(header).width;
  context.fillText(header, (pageWidth - headerWidth) / 2, y + headerSize);
  y += headerSize + Math.floor(margin / 2);

  context.strokeStyle = "grey";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(margin, y);
  context.lineTo(pageWidth - margin, y);
  context.stroke();
  y += Math.floor(margin / 2);

  const charPairs = Array.from({ length: 26 }, (_, index) => {
    const upperCode = "A".charCodeAt(0) + index;
    return [String.fromCharCode(upperCode), String.fromCharCode(upperCode + 32)] as const;
  });

  const pairsPerRow = [4, 4, 5, 4, 5, 4, 4];
  const pairRows: Array<Array<readonly [string, string]>> = [];
  let pairIndex = 0;
  for (const pairsInRow of pairsPerRow) {
    pairRows.push(charPairs.slice(pairIndex, pairIndex + pairsInRow));
    pairIndex += pairsInRow;
  }

  const numberRows = [["0", "1", "2", "3", "4", "5"], ["6", "7", "8", "9"]];
  const totalRows = pairRows.length + numberRows.length;
  const rowHeight = (pageHeight - y - margin) / totalRows;
  const letterSize = Math.floor(rowHeight);
  const strokeWidth = Math.max(1, Math.floor(safeDpi * 0.01));
  const gap = Math.floor(letterSize * 0.1);
  context.font = `${letterSize}px "${fontFamily}"`;
  context.textBaseline = "alphabetic";
  context.strokeStyle = "grey";
  context.lineWidth = 1;

  for (const rowPairs of pairRows) {
    const topLine = y + rowHeight * 0.25;
    const bottomLine = y + rowHeight * 0.75;
    context.beginPath();
    context.moveTo(margin, topLine);
    context.lineTo(pageWidth - margin, topLine);
    context.moveTo(margin, bottomLine);
    context.lineTo(pageWidth - margin, bottomLine);
    context.stroke();

    const cellWidth = (pageWidth - 2 * margin) / rowPairs.length;
    for (const [columnIndex, [upper, lower]] of rowPairs.entries()) {
      const x0 = margin + columnIndex * cellWidth;
      const upperM = getGlyphMetrics(context, upper);
      const lowerM = getGlyphMetrics(context, lower);
      const upperWidth = upperM.right - upperM.left;
      const lowerWidth = lowerM.right - lowerM.left;
      const totalWidth = upperWidth + lowerWidth + gap;
      const upperX = x0 + (cellWidth - totalWidth) / 2 - upperM.left;
      const lowerX = upperX + upperWidth + gap - lowerM.left;
      drawOutlinedGlyph(context, upper, upperX, bottomLine, strokeWidth);
      drawOutlinedGlyph(context, lower, lowerX, bottomLine, strokeWidth);
    }

    y += rowHeight;
  }

  for (const numbers of numberRows) {
    const topLine = y + rowHeight * 0.25;
    const bottomLine = y + rowHeight * 0.75;
    context.beginPath();
    context.moveTo(margin, topLine);
    context.lineTo(pageWidth - margin, topLine);
    context.moveTo(margin, bottomLine);
    context.lineTo(pageWidth - margin, bottomLine);
    context.stroke();

    const cellWidth = (pageWidth - 2 * margin) / numbers.length;
    for (const [columnIndex, number] of numbers.entries()) {
      const x0 = margin + columnIndex * cellWidth;
      const numberM = getGlyphMetrics(context, number);
      const numberWidth = numberM.right - numberM.left;
      const numberX = x0 + (cellWidth - numberWidth) / 2 - numberM.left;
      drawOutlinedGlyph(context, number, numberX, bottomLine, strokeWidth);
    }

    y += rowHeight;
  }

  return canvas.toBuffer("image/png");
}
