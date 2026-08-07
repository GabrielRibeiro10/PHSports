/**
 * Shared XSS payload fixtures.
 *
 * These are the classic vectors used against React apps: raw script tags,
 * event-handler injection, `javascript:` URLs, scheme obfuscation with
 * control characters, SVG/data-URL execution and CSS expression abuse.
 *
 * Every sanitizer and every rendered surface is exercised against this list
 * so a regression anywhere in the pipeline fails the suite.
 */
export const XSS_TEXT_PAYLOADS = [
  `<script>alert(1)</script>`,
  `<img src=x onerror=alert(1)>`,
  `<svg/onload=alert(1)>`,
  `"><script>alert(document.cookie)</script>`,
  `<iframe src="javascript:alert(1)"></iframe>`,
  `<body onload=alert(1)>`,
  `<a href="javascript:alert(1)">click</a>`,
  `<div style="background:url(javascript:alert(1))">x</div>`,
  `<input autofocus onfocus=alert(1)>`,
  `{{constructor.constructor('alert(1)')()}}`,
  `\u0000<script>alert(1)</script>`,
  `<ScRiPt>alert(1)</ScRiPt>`,
  `<style>@import 'http://evil.test/x.css';</style>`,
  `<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="></object>`,
] as const;

export const XSS_URL_PAYLOADS = [
  `javascript:alert(1)`,
  `JaVaScRiPt:alert(1)`,
  `java\tscript:alert(1)`,
  `java\nscript:alert(1)`,
  ` javascript:alert(1)`,
  `vbscript:msgbox(1)`,
  `data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==`,
  `data:text/html,<script>alert(1)</script>`,
  `file:///etc/passwd`,
  `about:blank`,
  `//evil.test/steal`,
] as const;

/** Assert a DOM subtree contains no executable/injected markup. */
export function expectNoUnsafeMarkup(root: HTMLElement | Document) {
  const scope = root instanceof Document ? root.body : root;
  const html = scope.innerHTML;

  if (scope.querySelector("script, iframe, object, embed")) {
    throw new Error("Rendered output contains an executable element");
  }
  if (/\son(error|load|click|focus|mouseover)\s*=/i.test(html)) {
    throw new Error("Rendered output contains an inline event handler");
  }
  for (const el of Array.from(scope.querySelectorAll("*"))) {
    for (const attr of Array.from(el.attributes)) {
      const v = attr.value.replace(/[\u0000-\u001F\s]/g, "").toLowerCase();
      if (v.startsWith("javascript:") || v.startsWith("vbscript:") || v.startsWith("data:text/html")) {
        throw new Error(`Unsafe attribute value on <${el.tagName.toLowerCase()} ${attr.name}>`);
      }
    }
  }
}
