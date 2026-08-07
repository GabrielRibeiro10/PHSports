import { describe, expect, it } from "vitest";
import {
  safeCssColor,
  safeImageUrl,
  safeRedirectPath,
  safeUrl,
  sanitizeEmail,
  sanitizeText,
} from "@/lib/input-safety";
import { XSS_TEXT_PAYLOADS, XSS_URL_PAYLOADS } from "@/test/xss-payloads";

describe("sanitizeText", () => {
  it.each(XSS_TEXT_PAYLOADS)("neutralizes %j", (payload) => {
    const out = sanitizeText(payload);
    expect(out).not.toMatch(/[<>]/);
    expect(out).not.toMatch(/[\u0000-\u001F\u007F]/);
  });

  it("caps length and rejects non-strings", () => {
    expect(sanitizeText("a".repeat(1000), 10)).toHaveLength(10);
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText({ toString: () => "<script>" })).toBe("");
  });
});

describe("sanitizeEmail", () => {
  it("rejects injected emails", () => {
    expect(sanitizeEmail(`a@b.com<script>alert(1)</script>`)).toBe("");
    expect(sanitizeEmail(`"><img src=x onerror=alert(1)>@b.com`)).toBe("");
    expect(sanitizeEmail("Cliente@PHSports.com.br")).toBe("cliente@phsports.com.br");
  });
});

describe("safeUrl", () => {
  it.each(XSS_URL_PAYLOADS)("blocks %j", (payload) => {
    expect(safeUrl(payload)).toBeUndefined();
  });

  it("allows legitimate targets", () => {
    expect(safeUrl("https://wa.me/5512992319709")).toBeTruthy();
    expect(safeUrl("/produto/camisa")).toBe("/produto/camisa");
    expect(safeUrl("mailto:phsportsilha@gmail.com")).toBeTruthy();
  });
});

describe("safeImageUrl", () => {
  it.each(XSS_URL_PAYLOADS)("blocks %j", (payload) => {
    expect(safeImageUrl(payload)).toBeUndefined();
  });

  it("allows https and base64 images only", () => {
    expect(safeImageUrl("https://cdn.test/a.png")).toBeTruthy();
    expect(safeImageUrl("data:image/png;base64,iVBORw0KGgo=")).toBeTruthy();
    expect(safeImageUrl("data:image/svg+xml,<svg onload=alert(1)>")).toBeUndefined();
  });
});

describe("safeCssColor", () => {
  it("blocks css based injection", () => {
    expect(safeCssColor("red;}body{display:none")).toBeUndefined();
    expect(safeCssColor("url(javascript:alert(1))")).toBeUndefined();
    expect(safeCssColor("expression(alert(1))")).toBeUndefined();
    expect(safeCssColor("#ff0000")).toBe("#ff0000");
  });
});

describe("safeRedirectPath", () => {
  it("keeps redirects same-origin", () => {
    expect(safeRedirectPath("//evil.test")).toBe("/");
    expect(safeRedirectPath("https://evil.test")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath("/admin/produtos")).toBe("/admin/produtos");
  });
});
