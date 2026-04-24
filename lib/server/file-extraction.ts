import { mkdir } from "fs/promises";
import { createRequire } from "module";
import path from "path";

const runtimeRequire = createRequire(import.meta.url);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 50_000;
const MAX_OCR_PAGES = 10;
const OCR_LANGS = process.env.TESSERACT_LANGS ?? "eng+spa";
const TESSERACT_CACHE_DIR = path.join(process.cwd(), ".cache", "tesseract");
const OCR_TIMEOUT_MS = 45_000;
const EXTRACTION_TIMEOUT_MS = 60_000;

type ExtractionMethod = "text" | "pdf" | "docx" | "image";
type OcrRecognitionResult = {
  data?: {
    text?: string;
  };
};

export type FileDetection = {
  detectedMime: string;
  method: ExtractionMethod;
  extension: string;
};

export type ExtractionResult = {
  text: string;
  detectedMime: string;
  method: ExtractionMethod;
  usedOcr: boolean;
  previewUrl?: string;
  warning?: string;
};

export class FileExtractionError extends Error {
  status: number;
  exposeMessage: string;

  constructor(message: string, status = 400, exposeMessage = message, cause?: unknown) {
    super(message);
    this.name = "FileExtractionError";
    this.status = status;
    this.exposeMessage = exposeMessage;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

const EXT_TO_MIME: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
};

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function bufferStartsWith(buffer: Buffer, bytes: number[]): boolean {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function detectImageMime(buffer: Buffer): string | null {
  if (bufferStartsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (bufferStartsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bufferStartsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (bufferStartsWith(buffer, [0x42, 0x4d])) return "image/bmp";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "%PDF";
}

function isZip(buffer: Buffer): boolean {
  return buffer.length >= 4 && bufferStartsWith(buffer, [0x50, 0x4b, 0x03, 0x04]);
}

function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  if (sample.length === 0) return false;

  let printable = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte >= 128) {
      printable += 1;
    }
  }

  return printable / sample.length > 0.9;
}

export function detectFileType(fileName: string, claimedMime: string, buffer: Buffer): FileDetection {
  const extension = extensionOf(fileName);
  const claimed = claimedMime.toLowerCase().trim();
  const imageMime = detectImageMime(buffer);

  if (isPdf(buffer)) {
    return { detectedMime: "application/pdf", method: "pdf", extension: extension || "pdf" };
  }

  if (imageMime) {
    return { detectedMime: imageMime, method: "image", extension: extension || imageMime.split("/")[1] };
  }

  if (isZip(buffer) && (extension === "docx" || claimed.includes("wordprocessingml.document"))) {
    return {
      detectedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      method: "docx",
      extension: extension || "docx",
    };
  }

  if (looksLikeText(buffer) && (claimed.startsWith("text/") || ["txt", "md", "csv", "tsv"].includes(extension))) {
    return {
      detectedMime: (EXT_TO_MIME[extension] ?? claimed) || "text/plain",
      method: "text",
      extension: extension || "txt",
    };
  }

  if (claimed === "application/pdf" || extension === "pdf") {
    throw new FileExtractionError(
      "The uploaded file claims to be a PDF, but its binary signature is invalid.",
      415,
      "El archivo no parece ser un PDF válido. Probá volver a exportarlo o subir otro archivo.",
    );
  }

  if (claimed.includes("word") || extension === "docx" || extension === "doc") {
    throw new FileExtractionError(
      "The uploaded file claims to be a Word document, but its binary signature is invalid.",
      415,
      "El archivo no parece ser un documento Word válido. Probá exportarlo nuevamente.",
    );
  }

  if (claimed.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(extension)) {
    throw new FileExtractionError(
      "The uploaded file claims to be an image, but its binary signature is invalid.",
      415,
      "La imagen no es válida o está dañada. Probá con una imagen más clara.",
    );
  }

  if (looksLikeText(buffer)) {
    return {
      detectedMime: EXT_TO_MIME[extension] ?? "text/plain",
      method: "text",
      extension: extension || "txt",
    };
  }

  throw new FileExtractionError(
    `Unsupported file type: ${claimed || "unknown"} (${extension || "no extension"}).`,
    415,
    "Formato no compatible. Subí PDF, DOCX, TXT, MD, CSV o una imagen clara.",
  );
}

export function validateUploadedFile(file: File, buffer: Buffer): FileDetection {
  if (!file.name.trim()) {
    throw new FileExtractionError("Missing file name.", 400, "El archivo no tiene nombre.");
  }

  if (file.name.length > 255) {
    throw new FileExtractionError("File name too long.", 400, "El nombre del archivo es demasiado largo.");
  }

  if (file.size <= 0 || buffer.length === 0) {
    throw new FileExtractionError("Empty file.", 400, "El archivo está vacío.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new FileExtractionError(
      `File too large: ${file.size} bytes.`,
      413,
      `El archivo supera el límite de ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    );
  }

  return detectFileType(file.name, file.type, buffer);
}

function truncateText(text: string): string {
  const clean = text.trim();
  if (clean.length <= MAX_EXTRACTED_CHARS) return clean;
  return `${clean.slice(0, MAX_EXTRACTED_CHARS)}\n\n[... truncated at ${MAX_EXTRACTED_CHARS} characters]`;
}

function toPreviewDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function normalizeText(text: string): string {
  return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function hasEnoughText(text: string): boolean {
  return text.replace(/\s/g, "").length >= 20;
}

function isPasswordError(message: string): boolean {
  return /password/i.test(message);
}

function isCanvasError(message: string): boolean {
  return /canvas/i.test(message) || /native module/i.test(message) || /Cannot find module.*canvas/i.test(message);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new FileExtractionError(
            `${label} timed out.`,
            504,
            "El procesamiento del archivo tardó demasiado. Probá con un archivo más chico o más claro.",
          ));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ── pdf-parse loader ─────────────────────────────────────────────────────────

type PdfParseV1Fn = (buffer: Buffer, options?: Record<string, unknown>) => Promise<{ text: string; numpages: number }>;

interface PdfParseV2Instance {
  getText(opts: { itemJoiner: string; pageJoiner: string }): Promise<{ text?: string }>;
  getInfo(): Promise<{ total?: number }>;
  getScreenshot(opts: {
    partial: number[];
    desiredWidth: number;
    imageBuffer: boolean;
    imageDataUrl: boolean;
  }): Promise<{ pages: Array<{ data?: Uint8Array }> }>;
  destroy(): Promise<void>;
}

interface PdfParseV2Ctor {
  new (opts: { data: Buffer }): PdfParseV2Instance;
}

interface PdfParseModule {
  // v1 function-based API
  v1fn: PdfParseV1Fn | null;
  // v2 class-based API
  V2Class: PdfParseV2Ctor | null;
}

function loadPdfParseModule(): PdfParseModule {
  let raw: unknown;

  try {
    raw = runtimeRequire("pdf-parse");
  } catch {
    try {
      raw = runtimeRequire(
        path.join(process.cwd(), "node_modules", "pdf-parse", "dist", "pdf-parse", "cjs", "index.cjs"),
      );
    } catch {
      return { v1fn: null, V2Class: null };
    }
  }

  if (!raw) return { v1fn: null, V2Class: null };

  const mod = raw as Record<string, unknown>;

  // v1: the module itself is the function
  const v1fn =
    typeof raw === "function"
      ? (raw as PdfParseV1Fn)
      : typeof mod.default === "function"
        ? (mod.default as PdfParseV1Fn)
        : null;

  // v2: exports a PDFParse class
  const V2Class =
    (mod.PDFParse as PdfParseV2Ctor | undefined) ??
    ((mod.default as Record<string, unknown> | undefined)?.PDFParse as PdfParseV2Ctor | undefined) ??
    null;

  return { v1fn, V2Class };
}

// ── OCR helper ───────────────────────────────────────────────────────────────

async function loadMammoth(): Promise<{ extractRawText(opts: { buffer: Buffer }): Promise<{ value?: string }> }> {
  try {
    return runtimeRequire("mammoth") as ReturnType<typeof loadMammoth> extends Promise<infer T> ? T : never;
  } catch {
    return (await import("mammoth")) as ReturnType<typeof loadMammoth> extends Promise<infer T> ? T : never;
  }
}

async function createOcrWorker(): Promise<{
  setParameters(params: Record<string, string>): Promise<void>;
  recognize(buffer: Buffer): Promise<OcrRecognitionResult>;
  terminate(): Promise<void>;
}> {
  const Tesseract = runtimeRequire("tesseract.js") as {
    createWorker(langs: string, oem: number, opts: Record<string, unknown>): Promise<unknown>;
    OEM: { DEFAULT: number };
    PSM: { AUTO: string };
  };

  await mkdir(TESSERACT_CACHE_DIR, { recursive: true });

  const worker = await Tesseract.createWorker(OCR_LANGS, Tesseract.OEM.DEFAULT, {
    cachePath: TESSERACT_CACHE_DIR,
    logger: () => {},
  });

  await (worker as { setParameters(p: Record<string, string>): Promise<void> }).setParameters({
    preserve_interword_spaces: "1",
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
  });

  return worker as Awaited<ReturnType<typeof createOcrWorker>>;
}

async function runOcrOnImage(buffer: Buffer): Promise<string> {
  const worker = await createOcrWorker();

  try {
    const result = await withTimeout<OcrRecognitionResult>(
      worker.recognize(buffer) as Promise<OcrRecognitionResult>,
      OCR_TIMEOUT_MS,
      "OCR",
    );
    return normalizeText(result?.data?.text ?? "");
  } finally {
    await worker.terminate().catch(() => {});
  }
}

// ── PDF text extraction ───────────────────────────────────────────────────────

async function extractTextViaV1(v1fn: PdfParseV1Fn, buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const result = await v1fn(buffer, { max: 0 });
  return {
    text: normalizeText(result.text ?? ""),
    pageCount: result.numpages ?? 0,
  };
}

async function extractTextViaV2(V2Class: PdfParseV2Ctor, buffer: Buffer): Promise<{ text: string }> {
  const parser = new V2Class({ data: buffer });
  try {
    const result = await parser.getText({ itemJoiner: " ", pageJoiner: "\n\n" });
    return { text: normalizeText(result?.text ?? "") };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function runOcrViaPdfV2(
  V2Class: PdfParseV2Ctor,
  buffer: Buffer,
): Promise<{ text: string; pageCount: number; pagesOcrd: number }> {
  const parser = new V2Class({ data: buffer });

  try {
    // Check if getScreenshot is supported before starting
    if (typeof parser.getScreenshot !== "function") {
      throw new FileExtractionError(
        "getScreenshot not available on this pdf-parse build.",
        422,
        "Este PDF está escaneado y el reconocimiento óptico (OCR) no está disponible en este entorno. " +
          "Subí una versión editable del documento.",
      );
    }

    let pageCount = 1;
    try {
      const info = await parser.getInfo();
      pageCount = Math.max(1, info?.total ?? 1);
      console.info(`[pdf-extract] Page count from metadata: ${pageCount}`);
    } catch (infoErr) {
      console.warn("[pdf-extract] Could not read page count:", infoErr);
    }

    const pagesToProcess = Math.min(pageCount, MAX_OCR_PAGES);
    console.info(`[pdf-extract] OCR: will process ${pagesToProcess}/${pageCount} page(s)`);

    const pageTexts: string[] = [];
    let currentLength = 0;

    for (let pageNumber = 1; pageNumber <= pagesToProcess; pageNumber++) {
      try {
        const screenshots = await parser.getScreenshot({
          partial: [pageNumber],
          desiredWidth: 1800,
          imageBuffer: true,
          imageDataUrl: false,
        });

        const page = screenshots.pages[0];
        if (!page?.data?.length) {
          console.warn(`[pdf-extract] OCR page ${pageNumber}: no image data`);
          continue;
        }

        const pageText = await runOcrOnImage(Buffer.from(page.data));
        console.info(`[pdf-extract] OCR page ${pageNumber}/${pagesToProcess}: ${pageText.length} chars`);

        if (pageText) {
          pageTexts.push(pageText);
          currentLength += pageText.length;
        }

        if (currentLength >= MAX_EXTRACTED_CHARS) break;
      } catch (pageErr) {
        const msg = pageErr instanceof Error ? pageErr.message : String(pageErr);
        // If canvas is missing, abort early — no point trying more pages
        if (isCanvasError(msg)) {
          console.error("[pdf-extract] OCR aborted: canvas native module not available");
          throw new FileExtractionError(
            "Canvas module required for OCR is not installed.",
            422,
            "Este PDF está escaneado. El módulo para reconocimiento óptico (OCR) no está instalado en el servidor. " +
              "Subí una versión editable del documento.",
          );
        }
        console.error(`[pdf-extract] OCR page ${pageNumber} failed (skipping):`, msg);
      }
    }

    return {
      text: normalizeText(pageTexts.join("\n\n")),
      pageCount,
      pagesOcrd: pageTexts.length,
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractPdfText(
  buffer: Buffer,
  fileName: string,
): Promise<{ text: string; usedOcr: boolean; warning?: string }> {
  const sizeKb = (buffer.length / 1024).toFixed(1);
  console.info(`[pdf-extract] Starting extraction — file: "${fileName}", size: ${sizeKb} KB`);

  const { v1fn, V2Class } = loadPdfParseModule();

  if (!v1fn && !V2Class) {
    throw new FileExtractionError(
      "pdf-parse module not found.",
      500,
      "La extracción de PDF no está disponible en este momento. Contactá al soporte.",
    );
  }

  // ── Step 1: extract selectable text ──────────────────────────────────────
  let plainText = "";

  if (v1fn) {
    try {
      const { text, pageCount } = await extractTextViaV1(v1fn, buffer);
      plainText = text;
      console.info(`[pdf-extract] v1 API: ${plainText.length} chars, ${pageCount} pages`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[pdf-extract] v1 API failed: ${msg}`);
      if (isPasswordError(msg)) {
        throw new FileExtractionError(
          "Password-protected PDF.",
          422,
          "El PDF está protegido con contraseña. Quitá la protección e intentá de nuevo.",
          err,
        );
      }
    }
  } else if (V2Class) {
    try {
      const { text } = await extractTextViaV2(V2Class, buffer);
      plainText = text;
      console.info(`[pdf-extract] v2 API: ${plainText.length} chars extracted`);
    } catch (err) {
      if (err instanceof FileExtractionError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[pdf-extract] v2 API getText failed: ${msg}`);
      if (isPasswordError(msg)) {
        throw new FileExtractionError(
          "Password-protected PDF.",
          422,
          "El PDF está protegido con contraseña. Quitá la protección e intentá de nuevo.",
          err,
        );
      }
    }
  }

  if (hasEnoughText(plainText)) {
    console.info(`[pdf-extract] Selectable text found (${plainText.length} chars). Done.`);
    return { text: plainText, usedOcr: false };
  }

  // ── Step 2: scanned PDF — attempt OCR ────────────────────────────────────
  console.info(`[pdf-extract] No selectable text (${plainText.length} chars). PDF is likely scanned. Starting OCR…`);

  if (!V2Class) {
    // v1 API doesn't support rendering to image — can't OCR
    throw new FileExtractionError(
      "Scanned PDF, OCR not supported via v1 API.",
      422,
      "Este PDF parece estar escaneado (no tiene texto seleccionable). " +
        "Subí una versión editable del documento o convertilo a texto antes de subirlo.",
    );
  }

  const ocrResult = await runOcrViaPdfV2(V2Class, buffer);

  console.info(
    `[pdf-extract] OCR finished: ${ocrResult.text.length} chars from ${ocrResult.pagesOcrd}/${ocrResult.pageCount} pages`,
  );

  if (hasEnoughText(ocrResult.text)) {
    return {
      text: ocrResult.text,
      usedOcr: true,
      warning: "Se usó OCR porque el PDF no tenía texto seleccionable.",
    };
  }

  // OCR ran but got nothing useful — give the most specific error possible
  if (ocrResult.pagesOcrd === 0) {
    throw new FileExtractionError(
      "OCR produced no output — no pages rendered.",
      422,
      "Este PDF parece estar escaneado, pero el OCR no pudo extraer texto. " +
        "El archivo podría tener imágenes de muy baja calidad, estar dañado o tener protección especial.",
    );
  }

  throw new FileExtractionError(
    "OCR produced insufficient text.",
    422,
    `El PDF fue escaneado y el OCR procesó ${ocrResult.pagesOcrd} página(s) pero obtuvo muy poco texto. ` +
      "Probá con una versión de mayor resolución o un PDF editable.",
  );
}

// ── DOCX extraction ──────────────────────────────────────────────────────────

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await loadMammoth();
    const result = await mammoth.extractRawText({ buffer });
    return result?.value?.trim?.() ?? "";
  } catch (error) {
    console.error("[file-extraction] DOCX extraction failed.", error);
    throw new FileExtractionError(
      "Failed to extract text from DOCX.",
      422,
      "No se pudo leer el documento Word. Probá exportarlo nuevamente en formato DOCX.",
      error,
    );
  }
}

// ── Public entrypoint ────────────────────────────────────────────────────────

export async function extractUploadedFile(file: File): Promise<ExtractionResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const detection = validateUploadedFile(file, buffer);

  console.info(
    `[file-extraction] Processing "${file.name}" — detected: ${detection.detectedMime}, method: ${detection.method}`,
  );

  return withTimeout(
    (async () => {
      try {
        if (detection.method === "text") {
          const text = normalizeText(buffer.toString("utf8"));
          if (!hasEnoughText(text)) {
            throw new FileExtractionError(
              "Text file does not contain enough readable text.",
              422,
              "El archivo no contiene texto legible suficiente para procesarlo.",
            );
          }
          return {
            text: truncateText(text),
            detectedMime: detection.detectedMime,
            method: detection.method,
            usedOcr: false,
          };
        }

        if (detection.method === "docx") {
          const text = await extractDocxText(buffer);
          if (!hasEnoughText(text)) {
            throw new FileExtractionError(
              "DOCX file does not contain readable text.",
              422,
              "No se encontró texto legible en el documento. Probá con otra exportación.",
            );
          }
          return {
            text: truncateText(text),
            detectedMime: detection.detectedMime,
            method: detection.method,
            usedOcr: false,
          };
        }

        if (detection.method === "image") {
          const text = await runOcrOnImage(buffer);
          if (!hasEnoughText(text)) {
            throw new FileExtractionError(
              "OCR could not recover text from image.",
              422,
              "No se pudo leer texto en la imagen. Probá con una imagen más nítida o con mejor contraste.",
            );
          }
          return {
            text: truncateText(text),
            detectedMime: detection.detectedMime,
            method: detection.method,
            usedOcr: true,
            previewUrl: toPreviewDataUrl(buffer, detection.detectedMime),
            warning: "Se usó OCR para extraer texto de la imagen.",
          };
        }

        // PDF
        const pdfResult = await extractPdfText(buffer, file.name);
        return {
          text: truncateText(pdfResult.text),
          detectedMime: detection.detectedMime,
          method: detection.method,
          usedOcr: pdfResult.usedOcr,
          warning: pdfResult.warning,
        };
      } catch (error) {
        if (error instanceof FileExtractionError) throw error;

        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[file-extraction] Unexpected failure for "${file.name}": ${msg}`, error);

        throw new FileExtractionError(
          "Failed to extract file contents.",
          500,
          "No se pudo procesar el archivo. Probá con otra versión del documento.",
          error,
        );
      }
    })(),
    EXTRACTION_TIMEOUT_MS,
    "File extraction",
  );
}
