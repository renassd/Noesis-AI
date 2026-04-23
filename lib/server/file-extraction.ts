import { mkdir } from "fs/promises";
import { createRequire } from "module";
import path from "path";

const runtimeRequire = createRequire(import.meta.url);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 50_000;
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
      "El archivo no parece ser un PDF valido. Proba volver a exportarlo o subir otro archivo.",
    );
  }

  if (claimed.includes("word") || extension === "docx" || extension === "doc") {
    throw new FileExtractionError(
      "The uploaded file claims to be a Word document, but its binary signature is invalid.",
      415,
      "El archivo no parece ser un documento Word valido. Proba exportarlo nuevamente.",
    );
  }

  if (claimed.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(extension)) {
    throw new FileExtractionError(
      "The uploaded file claims to be an image, but its binary signature is invalid.",
      415,
      "La imagen no es valida o esta danada. Proba con una imagen mas clara.",
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
    "Formato no compatible. Subi PDF, DOCX, TXT, MD, CSV o una imagen clara.",
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
    throw new FileExtractionError("Empty file.", 400, "El archivo esta vacio.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new FileExtractionError(
      `File too large: ${file.size} bytes.`,
      413,
      `El archivo supera el limite de ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new FileExtractionError(`${label} timed out.`, 504, "El procesamiento del archivo tardo demasiado. Proba con un archivo mas chico o mas claro."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function loadPdfParse(): any {
  try {
    return runtimeRequire("pdf-parse");
  } catch {
    return runtimeRequire(path.join(process.cwd(), "node_modules", "pdf-parse", "dist", "pdf-parse", "cjs", "index.cjs"));
  }
}

async function loadMammoth(): Promise<any> {
  try {
    return runtimeRequire("mammoth");
  } catch {
    return await import("mammoth");
  }
}

async function createOcrWorker(): Promise<any> {
  const Tesseract = runtimeRequire("tesseract.js");
  await mkdir(TESSERACT_CACHE_DIR, { recursive: true });

  const worker = await Tesseract.createWorker(OCR_LANGS, Tesseract.OEM.DEFAULT, {
    cachePath: TESSERACT_CACHE_DIR,
    logger: () => {},
  });

  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
  });

  return worker;
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

async function extractPdfText(buffer: Buffer): Promise<{ text: string; usedOcr: boolean; warning?: string }> {
  const pdfParseModule = loadPdfParse();
  const PDFParse = pdfParseModule.PDFParse ?? pdfParseModule.default?.PDFParse;

  if (!PDFParse) {
    throw new FileExtractionError(
      "pdf-parse is unavailable.",
      500,
      "La extraccion de PDF no esta disponible en este momento.",
    );
  }

  const parser = new PDFParse({ data: buffer });

  try {
    try {
      const result = await parser.getText({
        itemJoiner: " ",
        pageJoiner: "\n\n",
      });
      const plainText = normalizeText(result?.text ?? "");
      if (hasEnoughText(plainText)) {
        return { text: plainText, usedOcr: false };
      }
    } catch (error) {
      console.error("[file-extraction] PDF text extraction failed, falling back to OCR.", error);
      const message = error instanceof Error ? error.message : String(error);
      if (isPasswordError(message)) {
        throw new FileExtractionError(
          "Password-protected PDF.",
          422,
          "El PDF esta protegido con contrasena. Quita la proteccion y volve a intentarlo.",
          error,
        );
      }
    }

    let info: { total?: number } | null = null;
    try {
      info = await parser.getInfo();
    } catch (error) {
      console.error("[file-extraction] PDF metadata inspection failed before OCR.", error);
    }

    const totalPages = Math.max(1, info?.total ?? 1);
    const pageTexts: string[] = [];
    let currentLength = 0;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const screenshots = await parser.getScreenshot({
        partial: [pageNumber],
        desiredWidth: 1800,
        imageBuffer: true,
        imageDataUrl: false,
      });

      const page = screenshots.pages[0];
      if (!page?.data?.length) continue;

      const pageText = await runOcrOnImage(Buffer.from(page.data));
      if (!pageText) continue;

      pageTexts.push(pageText);
      currentLength += pageText.length;
      if (currentLength >= MAX_EXTRACTED_CHARS) break;
    }

    const ocrText = normalizeText(pageTexts.join("\n\n"));
    if (hasEnoughText(ocrText)) {
      return {
        text: ocrText,
        usedOcr: true,
        warning: "OCR was used because the PDF did not contain selectable text.",
      };
    }

    throw new FileExtractionError(
      "OCR could not recover text from the PDF.",
      422,
      "Este archivo no contiene texto seleccionable. Proba subir un PDF editable o una imagen mas clara.",
    );
  } finally {
    await parser.destroy().catch(() => {});
  }
}

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
      "No se pudo leer el documento Word. Proba exportarlo nuevamente en formato DOCX.",
      error,
    );
  }
}

export async function extractUploadedFile(file: File): Promise<ExtractionResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const detection = validateUploadedFile(file, buffer);

  return withTimeout((async () => {
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
            "No se encontro texto legible en el documento. Proba con otra exportacion.",
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
            "No se pudo leer texto en la imagen. Proba con una imagen mas nitida o con mejor contraste.",
          );
        }

        return {
          text: truncateText(text),
          detectedMime: detection.detectedMime,
          method: detection.method,
          usedOcr: true,
          previewUrl: toPreviewDataUrl(buffer, detection.detectedMime),
          warning: "OCR was used to extract text from the image.",
        };
      }

      const pdfResult = await extractPdfText(buffer);
      return {
        text: truncateText(pdfResult.text),
        detectedMime: detection.detectedMime,
        method: detection.method,
        usedOcr: pdfResult.usedOcr,
        warning: pdfResult.warning,
      };
    } catch (error) {
      if (error instanceof FileExtractionError) {
        throw error;
      }

      console.error("[file-extraction] Unexpected extraction failure.", error);
      throw new FileExtractionError(
        "Failed to extract file contents.",
        500,
        "No se pudo extraer texto del archivo. Proba con otra version del documento o con una imagen mas clara.",
        error,
      );
    }
  })(), EXTRACTION_TIMEOUT_MS, "File extraction");
}
