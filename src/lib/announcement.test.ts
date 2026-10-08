import { describe, expect, it } from "vitest";
import { parseAnnouncement, safeHref } from "./announcement";

describe("safeHref", () => {
  it("aceita caminho do site e https", () => {
    expect(safeHref("/categoria/retro")).toBe("/categoria/retro");
    expect(safeHref("https://wa.me/5512999990000")).toBe("https://wa.me/5512999990000");
  });
  it("recusa esquemas perigosos e links fora do padrão", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.com", "http://x.com", "/a b", "\\\\evil", "", "  ", 5, null, undefined]) {
      expect(safeHref(bad)).toBeNull();
    }
  });
});

describe("parseAnnouncement", () => {
  it("só fica ativo com texto", () => {
    expect(parseAnnouncement({ active: "1", text: "" }).active).toBe(false);
    expect(parseAnnouncement({ active: "0", text: "Frete grátis" }).active).toBe(false);
    expect(parseAnnouncement({ active: "1", text: "Frete grátis" }).active).toBe(true);
  });
  it("limita o tamanho e junta espaços", () => {
    expect(parseAnnouncement({ active: "1", text: "a".repeat(500) }).text).toHaveLength(140);
    expect(parseAnnouncement({ active: "1", text: "  oi   mundo " }).text).toBe("oi mundo");
  });
  it("tolera dados estranhos", () => {
    expect(parseAnnouncement(null).active).toBe(false);
    expect(parseAnnouncement("x").text).toBe("");
    expect(parseAnnouncement({ text: { a: 1 }, active: "1" }).active).toBe(false);
  });
});
