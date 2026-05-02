"use client";

import { fetchWithSupabaseAuth } from "@/lib/supabase-browser";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/upload-config";
import { useEffect, useRef, useState } from "react";

// -- Types -------------------------------------------------------------------

export interface ImportedTextFile {
  content: string;
  fileName: string;
  mimeType?: string;
  source: "upload" | "drive" | "local";
  usedOcr?: boolean;
  warning?: string | null;
}

interface ImportBarProps {
  onTextFile?: (file: ImportedTextFile) => void;
  onImageFile?: (dataUrl: string, fileName: string) => void;
  lang?: "en" | "es";
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";
type DriveStatus  = "idle" | "loading" | "picking" | "fetching" | "error" | "not_configured";

// -- Copy --------------------------------------------------------------------

const COPY = {
  en: {
    file:          "Upload file",
    image:         "Upload image",
    drive:         "Drive",
    uploading:     "Uploading...",
    processing:    "Processing file...",
    reading:       "Trying to read content...",
    applyingOcr:   "Applying OCR...",
    loadedPrefix:  "Loaded:",
    ocrUsed:       "The file had no selectable text. OCR was used.",
    pickFile:      "Pick a file from Drive",
    connecting:    "Connecting to Drive...",
    driveError:    "Drive error",
    uploadError:   "Upload failed",
    fileTooLarge:  `File exceeds the ${MAX_UPLOAD_MB} MB limit.`,
    noFiles:       "No recent files found",
    close:         "Close",
    retry:         "Retry",
    setupRequired: "Drive not configured",
    fetchingFile:  "Fetching file...",
  },
  es: {
    file:          "Subir archivo",
    image:         "Subir imagen",
    drive:         "Drive",
    uploading:     "Subiendo...",
    processing:    "Procesando archivo...",
    reading:       "Intentando leer contenido...",
    applyingOcr:   "Aplicando OCR...",
    loadedPrefix:  "Cargado:",
    ocrUsed:       "El archivo no contenia texto seleccionable. Se utilizo OCR.",
    pickFile:      "Elegir un archivo de Drive",
    connecting:    "Conectando con Drive...",
    driveError:    "Error de Drive",
    uploadError:   "Error al subir",
    fileTooLarge:  `El archivo supera el límite de ${MAX_UPLOAD_MB} MB.`,
    noFiles:       "No se encontraron archivos recientes",
    close:         "Cerrar",
    retry:         "Reintentar",
    setupRequired: "Drive no configurado",
    fetchingFile:  "Obteniendo archivo...",
  },
} as const;

// -- Helpers -----------------------------------------------------------------

function fmtSize(bytes?: string): string {
  const n = parseInt(bytes ?? "0");
  if (!n) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image preview."));
    reader.readAsDataURL(file);
  });
}

// -- Component ---------------------------------------------------------------

export function ImportBar({ onTextFile, onImageFile, lang = "es" }: ImportBarProps) {
  const t = COPY[lang];

  const fileRef  = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [uploadStatus,  setUploadStatus]  = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [driveStatus,   setDriveStatus]   = useState<DriveStatus>("idle");
  const [driveFiles,    setDriveFiles]    = useState<DriveFile[]>([]);
  const [driveError,    setDriveError]    = useState<string | null>(null);
  const [showPicker,    setShowPicker]    = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const uploadPhaseTimers = useRef<number[]>([]);

  useEffect(() => {
    if (!showPicker) return;
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showPicker]);

  useEffect(() => {
    return () => {
      uploadPhaseTimers.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function clearUploadPhaseTimers() {
    uploadPhaseTimers.current.forEach((id) => window.clearTimeout(id));
    uploadPhaseTimers.current = [];
  }

  function startUploadPhaseMessages() {
    clearUploadPhaseTimers();
    setUploadMessage(t.processing);
    uploadPhaseTimers.current.push(window.setTimeout(() => setUploadMessage(t.reading), 900));
    uploadPhaseTimers.current.push(window.setTimeout(() => setUploadMessage(t.applyingOcr), 2800));
  }

  // -- Upload file (PDF/DOCX go to server, plain text stays client-side) -----
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Client-side size guard — keeps the UX snappy and avoids uploading large files
    // only to get a 413 back from the server. The server enforces the same limit.
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadStatus("error");
      setUploadMessage(t.fileTooLarge);
      setTimeout(() => { setUploadStatus("idle"); setUploadMessage(null); }, 5000);
      return;
    }

    const isPlainText = /^text\//i.test(file.type) ||
      /\.(txt|md|csv|tsv)$/i.test(file.name);
    const isImage = /^image\//i.test(file.type) ||
      /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);

    if (isPlainText) {
      try {
        const text = await file.text();
        onTextFile?.({
          content: text,
          fileName: file.name,
          mimeType: file.type || "text/plain",
          source: "local",
        });
        setUploadStatus("success");
        setUploadMessage(t.loadedPrefix + " " + file.name);
        setTimeout(() => { setUploadStatus("idle"); setUploadMessage(null); }, 3000);
      } catch {
        setUploadStatus("error");
        setUploadMessage(t.uploadError);
        setTimeout(() => { setUploadStatus("idle"); setUploadMessage(null); }, 3000);
      }
      return;
    }

    // PDF / DOCX -- POST to /api/upload
    setUploadStatus("uploading");
    startUploadPhaseMessages();

    try {
      if (isImage) {
        const preview = await readAsDataUrl(file);
        onImageFile?.(preview, file.name);
      }

      const form = new FormData();
      form.append("file", file);
      const res  = await fetchWithSupabaseAuth("/api/upload", { method: "POST", body: form });
      const contentType = res.headers.get("content-type") ?? "";
      const data = (contentType.includes("application/json")
        ? await res.json()
        : { error: lang === "en" ? "The server returned an invalid response." : "El servidor devolvio una respuesta invalida." }) as {
        text?: string;
        name?: string;
        type?: string;
        error?: string;
        previewUrl?: string | null;
        usedOcr?: boolean;
        warning?: string | null;
      };

      if (!res.ok || !data.text) throw new Error(data.error ?? t.uploadError);

      clearUploadPhaseTimers();
      if (isImage && data.previewUrl) {
        onImageFile?.(data.previewUrl, data.name ?? file.name);
      }
      onTextFile?.({
        content: data.text,
        fileName: data.name ?? file.name,
        mimeType: data.type ?? file.type,
        source: "upload",
        usedOcr: data.usedOcr,
        warning: data.warning,
      });
      setUploadStatus("success");
      setUploadMessage(data.usedOcr ? t.ocrUsed : t.loadedPrefix + " " + (data.name ?? file.name));
      setTimeout(() => { setUploadStatus("idle"); setUploadMessage(null); }, 3000);
    } catch (err) {
      clearUploadPhaseTimers();
      const msg = err instanceof Error ? err.message : t.uploadError;
      setUploadStatus("error");
      setUploadMessage(msg);
      setTimeout(() => { setUploadStatus("idle"); setUploadMessage(null); }, 4000);
    }
  }

  // -- Upload image (client-side FileReader, no server needed) ---------------
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onImageFile?.(reader.result as string, file.name);
      setUploadStatus("success");
      setUploadMessage(t.loadedPrefix + " " + file.name);
      setTimeout(() => { setUploadStatus("idle"); setUploadMessage(null); }, 3000);
    };
    reader.onerror = () => {
      setUploadStatus("error");
      setUploadMessage(t.uploadError);
      setTimeout(() => { setUploadStatus("idle"); setUploadMessage(null); }, 3000);
    };
    reader.readAsDataURL(file);
  }

  // -- Drive: check auth or open OAuth ---------------------------------------
  async function handleDriveClick() {
    if (showPicker) { setShowPicker(false); return; }

    setDriveStatus("loading");
    setDriveError(null);

    try {
      const res  = await fetchWithSupabaseAuth("/api/drive?action=files");
      const data = await res.json() as {
        files?: DriveFile[];
        error?: string;
        needsAuth?: boolean;
        setup?: boolean;
      };

      if (data.setup) {
        setDriveStatus("not_configured");
        setDriveError(t.setupRequired);
        setShowPicker(true);
        return;
      }

      if (data.needsAuth) {
        const authRes  = await fetchWithSupabaseAuth("/api/drive?action=auth_url");
        const authData = await authRes.json() as { url?: string; error?: string };
        if (authData.url) { window.location.href = authData.url; return; }
        setDriveStatus("error");
        setDriveError(authData.error ?? t.driveError);
        setShowPicker(true);
        return;
      }

      if (!res.ok || data.error) {
        setDriveStatus("error");
        setDriveError(data.error ?? t.driveError);
        setShowPicker(true);
        return;
      }

      setDriveFiles(data.files ?? []);
      setDriveStatus("picking");
      setShowPicker(true);
    } catch {
      setDriveStatus("error");
      setDriveError(t.driveError);
      setShowPicker(true);
    }
  }

  // -- Drive: fetch selected file content ------------------------------------
  async function handleDriveFileSelect(file: DriveFile) {
    setDriveStatus("fetching");
    try {
      const res  = await fetchWithSupabaseAuth("/api/drive?action=file&id=" + encodeURIComponent(file.id));
      const data = await res.json() as {
        text?: string;
        name?: string;
        type?: string;
        error?: string;
        usedOcr?: boolean;
        warning?: string | null;
      };
      if (!res.ok || !data.text) throw new Error(data.error ?? t.driveError);

      onTextFile?.({
        content: data.text,
        fileName: data.name ?? file.name,
        mimeType: data.type ?? file.mimeType,
        source: "drive",
        usedOcr: data.usedOcr,
        warning: data.warning,
      });
      setShowPicker(false);
      setDriveStatus("idle");
      setUploadStatus("success");
      setUploadMessage(t.loadedPrefix + " " + (data.name ?? file.name));
      setTimeout(() => { setUploadStatus("idle"); setUploadMessage(null); }, 3000);
    } catch (err) {
      setDriveStatus("error");
      setDriveError(err instanceof Error ? err.message : t.driveError);
    }
  }

  const isUploading  = uploadStatus === "uploading";
  const driveLoading = driveStatus === "loading" || driveStatus === "fetching";

  return (
    <div className="import-bar" style={{ position: "relative" }}>
      <input ref={fileRef}  type="file" accept=".txt,.pdf,.docx,.doc,.md,.csv,.tsv,.png,.jpg,.jpeg,.webp,.gif,.bmp"
        style={{ display: "none" }} onChange={handleFileChange} aria-label={t.file} />
      <input ref={imageRef} type="file" accept="image/*"
        style={{ display: "none" }} onChange={handleImageChange} aria-label={t.image} />

      <div className="import-bar-actions">

        {/* Upload file */}
        <button type="button"
          className={"import-btn" + (isUploading ? " import-btn--loading" : "")}
          onClick={() => fileRef.current?.click()} disabled={isUploading} title={t.file}
        >
          {isUploading
            ? <span className="import-spinner" aria-hidden="true" />
            : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1v9M5 4l3-3 3 3" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
          }
          <span>{isUploading ? t.uploading : t.file}</span>
        </button>

        <div className="import-bar-sep" aria-hidden="true" />

        {/* Upload image */}
        <button type="button" className="import-btn"
          onClick={() => imageRef.current?.click()} title={t.image}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="5.5" cy="6.5" r="1" fill="currentColor"/>
            <path d="M1 11l4-3.5L8 11l3-2.5 4 3.5" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{t.image}</span>
        </button>

        <div className="import-bar-sep" aria-hidden="true" />

        {/* Drive */}
        <button type="button"
          className={"import-btn import-btn-drive" + (showPicker ? " active" : "")}
          onClick={() => void handleDriveClick()} disabled={driveLoading} title={t.drive}
        >
          {driveLoading
            ? <span className="import-spinner" aria-hidden="true" />
            : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 2L1 11h4l1.5-3h3L11 11h4L9 2H6z" stroke="currentColor"
                  strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M5 11l2 3h2l2-3" stroke="currentColor"
                  strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
          }
          <span>{driveLoading ? (lang === "en" ? "Loading..." : "Cargando...") : t.drive}</span>
        </button>
      </div>

      {/* Status feedback */}
      {uploadMessage && (
        <div className="import-bar-feedback">
          <span className={uploadStatus === "error" ? "import-toast import-toast--error" : "import-loaded"}>
            {uploadStatus !== "error" && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {uploadMessage}
          </span>
        </div>
      )}

      {/* Drive file picker */}
      {showPicker && (
        <div ref={pickerRef} className="import-drive-picker" role="dialog" aria-label={t.pickFile}>
          <div className="import-drive-header">
            <span>{t.pickFile}</span>
            <button type="button" className="import-drive-close"
              onClick={() => setShowPicker(false)} aria-label={t.close}>
              &#215;
            </button>
          </div>

          {driveStatus === "not_configured" && (
            <div className="import-drive-message import-drive-message--setup">
              <p>{t.setupRequired}</p>
              <p style={{ fontSize: "11px", opacity: 0.7 }}>
                {lang === "en"
                  ? "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local"
                  : "Agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET a .env.local"}
              </p>
            </div>
          )}

          {driveStatus === "error" && driveError && (
            <div className="import-drive-message import-drive-message--error">
              <p>{driveError}</p>
              <button type="button" className="import-drive-retry"
                onClick={() => void handleDriveClick()}>{t.retry}</button>
            </div>
          )}

          {driveStatus === "fetching" && (
            <div className="import-drive-message">
              <span className="import-spinner" style={{ width: 16, height: 16 }} />
              <span>{t.fetchingFile}</span>
            </div>
          )}

          {driveStatus === "picking" && (
            <div className="import-drive-list">
              {driveFiles.length === 0 && (
                <p className="import-drive-empty">{t.noFiles}</p>
              )}
              {driveFiles.map((f) => (
                <button key={f.id} type="button" className="import-drive-file"
                  onClick={() => void handleDriveFileSelect(f)}>
                  <span className="import-drive-file-name">{f.name}</span>
                  {f.size && <span className="import-drive-file-size">{fmtSize(f.size)}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
