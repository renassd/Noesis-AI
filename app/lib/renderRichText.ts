"use client";

import katex from "katex";

type PlaceholderMap = Map<string, string>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMath(expr: string, displayMode: boolean): string {
  return katex.renderToString(expr.trim(), {
    throwOnError: false,
    displayMode,
    strict: "ignore",
  });
}

function shouldPromoteInlineMath(expr: string): boolean {
  const trimmed = expr.trim();
  if (trimmed.length >= 32) return true;
  if (/[=<>]/.test(trimmed) && trimmed.length >= 20) return true;
  if (/\\frac|\\sum|\\int|\\prod|\\sqrt|\\begin\{/.test(trimmed)) return true;
  return false;
}

function extractMath(text: string): { text: string; placeholders: PlaceholderMap } {
  const placeholders: PlaceholderMap = new Map();
  let index = 0;

  function createToken(html: string): string {
    const token = `ZZZMATH${index++}ZZZ`;
    placeholders.set(token, html);
    return token;
  }

  let output = text;

  output = output.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr: string) =>
    createToken(`<div class="math-block">${renderMath(expr, true)}</div>`),
  );
  output = output.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr: string) =>
    createToken(`<div class="math-block">${renderMath(expr, true)}</div>`),
  );
  output = output.replace(/\\\((.+?)\\\)/g, (_, expr: string) =>
    createToken(
      shouldPromoteInlineMath(expr)
        ? `<div class="math-block math-block--promoted">${renderMath(expr, true)}</div>`
        : `<span class="math-inline">${renderMath(expr, false)}</span>`,
    ),
  );
  output = output.replace(/\$([^$\n]+?)\$/g, (_, expr: string) =>
    createToken(
      shouldPromoteInlineMath(expr)
        ? `<div class="math-block math-block--promoted">${renderMath(expr, true)}</div>`
        : `<span class="math-inline">${renderMath(expr, false)}</span>`,
    ),
  );

  return { text: output, placeholders };
}

function restoreMath(text: string, placeholders: PlaceholderMap): string {
  let output = text;
  for (const [token, html] of placeholders.entries()) {
    output = output.replaceAll(token, html);
  }
  return output;
}

export function renderInlineRichText(text: string): string {
  const escaped = escapeHtml(text);
  const { text: withMath, placeholders } = extractMath(escaped);

  const formatted = withMath
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  return restoreMath(formatted, placeholders);
}

export function renderMarkdownWithMath(text: string): string {
  const escaped = escapeHtml(text);
  const { text: withMath, placeholders } = extractMath(escaped);
  const lines = withMath.split("\n");
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isListItem = /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line);
    const isMathOnly = /^ZZZMATH\d+ZZZ$/.test(trimmed);

    if (inList && !isListItem && trimmed !== "") {
      out.push("</ul>");
      inList = false;
    }

    if (/^###\s+/.test(line)) {
      out.push(`<h4>${renderInlineRichText(line.replace(/^###\s+/, ""))}</h4>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      out.push(`<h3>${renderInlineRichText(line.replace(/^##\s+/, ""))}</h3>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      out.push(`<h3>${renderInlineRichText(line.replace(/^#\s+/, ""))}</h3>`);
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      out.push("<hr />");
      continue;
    }
    if (isListItem) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      const itemText = line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
      out.push(`<li>${renderInlineRichText(itemText)}</li>`);
      continue;
    }
    if (trimmed === "") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push('<div class="rm-spacer"></div>');
      continue;
    }
    if (isMathOnly) {
      out.push(trimmed);
      continue;
    }

    out.push(`<p>${renderInlineRichText(line)}</p>`);
  }

  if (inList) out.push("</ul>");
  return restoreMath(out.join("\n"), placeholders);
}
