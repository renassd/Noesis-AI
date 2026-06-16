"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useLang } from "./i18n";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Tab = "profile" | "email" | "password";

interface AccountSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  email: string;
  name: string;
  onNameUpdate: (newName: string) => void;
  initialTab?: Tab;
}

const TEXT = {
  en: {
    title: "Account settings",
    close: "Close",
    tabProfile: "Profile",
    tabEmail: "Email",
    tabPassword: "Password",
    // Profile
    displayName: "Display name",
    namePlaceholder: "Your name",
    save: "Save",
    saving: "Saving...",
    currentEmail: "Current email",
    emailHint: "To change your email, go to the Email tab.",
    nameSaved: "Name updated successfully.",
    nameEmpty: "Name cannot be empty.",
    // Email
    newEmail: "New email",
    newEmailPlaceholder: "you@example.com",
    changeEmail: "Change email",
    emailInvalid: "Please enter a valid email address.",
    emailSame: "That is already your current email.",
    emailSuccess:
      "Check your inbox. You will receive a message at BOTH addresses to confirm the change.",
    // Password
    newPassword: "New password",
    confirmPassword: "Confirm password",
    changePassword: "Change password",
    passwordMismatch: "Passwords do not match.",
    passwordShort: "Password must be at least 8 characters.",
    passwordSuccess: "Password updated successfully.",
    passwordNote: "If you signed in with Google, you do not have a password.",
    genericError: "Something went wrong. Please try again.",
    noConfig: "Authentication is not configured.",
  },
  es: {
    title: "Configuración de cuenta",
    close: "Cerrar",
    tabProfile: "Perfil",
    tabEmail: "Email",
    tabPassword: "Contraseña",
    // Profile
    displayName: "Nombre para mostrar",
    namePlaceholder: "Tu nombre",
    save: "Guardar",
    saving: "Guardando...",
    currentEmail: "Email actual",
    emailHint: "Para cambiar tu email, ve a la pestaña Email.",
    nameSaved: "Nombre actualizado correctamente.",
    nameEmpty: "El nombre no puede estar vacío.",
    // Email
    newEmail: "Nuevo email",
    newEmailPlaceholder: "tu@ejemplo.com",
    changeEmail: "Cambiar email",
    emailInvalid: "Ingresá una dirección de email válida.",
    emailSame: "Ese ya es tu email actual.",
    emailSuccess:
      "Revisá tu casilla de correo. Recibirás un mensaje en AMBAS direcciones para confirmar el cambio.",
    // Password
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar contraseña",
    changePassword: "Cambiar contraseña",
    passwordMismatch: "Las contraseñas no coinciden.",
    passwordShort: "La contraseña debe tener al menos 8 caracteres.",
    passwordSuccess: "Contraseña actualizada correctamente.",
    passwordNote: "Si iniciaste sesión con Google, no tenés una contraseña.",
    genericError: "Algo salió mal. Intentá de nuevo.",
    noConfig: "La autenticación no está configurada.",
  },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountSettingsPanel({
  open,
  onClose,
  email,
  name,
  onNameUpdate,
  initialTab = "profile",
}: AccountSettingsPanelProps) {
  const { lang } = useLang();
  const t = TEXT[lang];

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Profile tab
  const [nameValue, setNameValue] = useState(name);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState("");
  const [nameError, setNameError] = useState("");

  // Email tab
  const [emailValue, setEmailValue] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");

  // Password tab
  const [pwValue, setPwValue] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  // Reset transient state when (re)opening or when source props change
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setNameValue(name);
      setNameSuccess("");
      setNameError("");
      setEmailValue("");
      setEmailSuccess("");
      setEmailError("");
      setPwValue("");
      setPwConfirm("");
      setPwSuccess("");
      setPwError("");
    }
  }, [open, initialTab, name]);

  // Escape to close + lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    // Clear all transient feedback when switching tabs
    setNameSuccess("");
    setNameError("");
    setEmailSuccess("");
    setEmailError("");
    setPwSuccess("");
    setPwError("");
  }

  const initial = (name.trim()[0] || email.trim()[0] || "?").toUpperCase();

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    setNameSuccess("");
    setNameError("");
    if (!trimmed) {
      setNameError(t.nameEmpty);
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setNameError(t.noConfig);
      return;
    }
    setNameLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });
      if (error) throw error;
      onNameUpdate(trimmed);
      setNameSuccess(t.nameSaved);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setNameLoading(false);
    }
  }

  async function handleChangeEmail() {
    const trimmed = emailValue.trim();
    setEmailSuccess("");
    setEmailError("");
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError(t.emailInvalid);
      return;
    }
    if (trimmed.toLowerCase() === email.trim().toLowerCase()) {
      setEmailError(t.emailSame);
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setEmailError(t.noConfig);
      return;
    }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) throw error;
      setEmailSuccess(t.emailSuccess);
      setEmailValue("");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePassword() {
    setPwSuccess("");
    setPwError("");
    if (pwValue.length < 8) {
      setPwError(t.passwordShort);
      return;
    }
    if (pwValue !== pwConfirm) {
      setPwError(t.passwordMismatch);
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setPwError(t.noConfig);
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwValue });
      if (error) throw error;
      setPwSuccess(t.passwordSuccess);
      setPwValue("");
      setPwConfirm("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setPwLoading(false);
    }
  }

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="asp-overlay" onClick={onClose} />
      <div
        className="asp-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="asp-header">
          <h3 className="asp-title">{t.title}</h3>
          <button
            type="button"
            className="asp-close"
            onClick={onClose}
            aria-label={t.close}
          >
            ✕
          </button>
        </div>

        <div className="asp-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            className={`asp-tab${activeTab === "profile" ? " asp-tab--active" : ""}`}
            onClick={() => switchTab("profile")}
          >
            {t.tabProfile}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "email"}
            className={`asp-tab${activeTab === "email" ? " asp-tab--active" : ""}`}
            onClick={() => switchTab("email")}
          >
            {t.tabEmail}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "password"}
            className={`asp-tab${activeTab === "password" ? " asp-tab--active" : ""}`}
            onClick={() => switchTab("password")}
          >
            {t.tabPassword}
          </button>
        </div>

        <div className="asp-body">
          {activeTab === "profile" && (
            <>
              <div className="asp-avatar-row">
                <span className="asp-avatar" aria-hidden="true">
                  {initial}
                </span>
              </div>

              <div className="asp-section">
                <label className="asp-label" htmlFor="asp-name">
                  {t.displayName}
                </label>
                <input
                  id="asp-name"
                  className="asp-input"
                  type="text"
                  value={nameValue}
                  placeholder={t.namePlaceholder}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleSaveName()}
                />
                <button
                  type="button"
                  className="asp-btn"
                  onClick={() => void handleSaveName()}
                  disabled={nameLoading}
                >
                  {nameLoading ? t.saving : t.save}
                </button>
                {nameSuccess && <p className="asp-success">{nameSuccess}</p>}
                {nameError && <p className="asp-error">{nameError}</p>}
              </div>

              <div className="asp-section">
                <label className="asp-label" htmlFor="asp-profile-email">
                  {t.currentEmail}
                </label>
                <input
                  id="asp-profile-email"
                  className="asp-input"
                  type="email"
                  value={email}
                  readOnly
                />
                <p className="asp-note">{t.emailHint}</p>
              </div>
            </>
          )}

          {activeTab === "email" && (
            <>
              <div className="asp-section">
                <label className="asp-label" htmlFor="asp-email-current">
                  {t.currentEmail}
                </label>
                <input
                  id="asp-email-current"
                  className="asp-input"
                  type="email"
                  value={email}
                  readOnly
                />
              </div>

              <div className="asp-section">
                <label className="asp-label" htmlFor="asp-email-new">
                  {t.newEmail}
                </label>
                <input
                  id="asp-email-new"
                  className="asp-input"
                  type="email"
                  value={emailValue}
                  placeholder={t.newEmailPlaceholder}
                  onChange={(e) => setEmailValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleChangeEmail()}
                />
                <button
                  type="button"
                  className="asp-btn"
                  onClick={() => void handleChangeEmail()}
                  disabled={emailLoading}
                >
                  {emailLoading ? t.saving : t.changeEmail}
                </button>
                {emailSuccess && <p className="asp-success">{emailSuccess}</p>}
                {emailError && <p className="asp-error">{emailError}</p>}
              </div>
            </>
          )}

          {activeTab === "password" && (
            <>
              <div className="asp-section">
                <label className="asp-label" htmlFor="asp-pw-new">
                  {t.newPassword}
                </label>
                <input
                  id="asp-pw-new"
                  className="asp-input"
                  type="password"
                  value={pwValue}
                  onChange={(e) => setPwValue(e.target.value)}
                />
              </div>

              <div className="asp-section">
                <label className="asp-label" htmlFor="asp-pw-confirm">
                  {t.confirmPassword}
                </label>
                <input
                  id="asp-pw-confirm"
                  className="asp-input"
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleChangePassword()}
                />
                <button
                  type="button"
                  className="asp-btn"
                  onClick={() => void handleChangePassword()}
                  disabled={pwLoading}
                >
                  {pwLoading ? t.saving : t.changePassword}
                </button>
                {pwSuccess && <p className="asp-success">{pwSuccess}</p>}
                {pwError && <p className="asp-error">{pwError}</p>}
                <p className="asp-note">{t.passwordNote}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
