import { describe, it, expect, afterEach } from "vitest";
import { enlaceDeReseteo, hashToken, nuevoToken, urlDeLaApp, vencimiento, VIGENCIA_MINUTOS } from "../reseteo";
import { mailReseteo } from "../mail";

describe("código de recuperación", () => {
  it("el hash es el de sha256 y no revela el código", () => {
    const { token, hash } = nuevoToken();
    expect(hash).toBe(hashToken(token));
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
  });
  it("cada código es distinto y largo", () => {
    const a = nuevoToken();
    const b = nuevoToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(40);
  });
  it("vence a la hora", () => {
    const ahora = new Date("2026-11-15T12:00:00Z");
    expect(vencimiento(ahora).getTime() - ahora.getTime()).toBe(VIGENCIA_MINUTOS * 60_000);
  });
});

describe("link del mail", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });
  it("usa APP_URL, sin barra final, y codifica el código", () => {
    process.env.APP_URL = "https://ejemplo.test/";
    expect(urlDeLaApp()).toBe("https://ejemplo.test");
    expect(enlaceDeReseteo("a b")).toBe("https://ejemplo.test/restablecer?t=a%20b");
  });
  it("sin APP_URL usa la URL de producción de Vercel", () => {
    delete process.env.APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "bitacora.vercel.app";
    expect(urlDeLaApp()).toBe("https://bitacora.vercel.app");
  });
});

describe("mail", () => {
  it("lleva el link, saluda por el primer nombre y escapa el HTML", () => {
    const m = mailReseteo("Ale <script>", "https://x.test/restablecer?t=abc&u=1");
    expect(m.texto).toContain("https://x.test/restablecer?t=abc&u=1");
    expect(m.texto.startsWith("Hola Ale,")).toBe(true);
    expect(m.html).toContain("t=abc&amp;u=1");
    expect(m.html).not.toContain("<script>");
  });
});
