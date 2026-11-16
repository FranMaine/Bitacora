import { describe, it, expect } from "vitest";
import { hayConflicto, horaArgentina, versionDe } from "../version";

describe("versión de un entrenamiento", () => {
  const t = new Date("2026-11-16T21:18:10.122Z");
  it("sin fecha es '0' (todavía no existía)", () => {
    expect(versionDe(null)).toBe("0");
    expect(versionDe(undefined)).toBe("0");
    expect(versionDe(t)).toBe(String(t.getTime()));
  });
  it("no hay conflicto si la versión coincide", () => {
    expect(hayConflicto(versionDe(t), t)).toBe(false);
    expect(hayConflicto("0", null)).toBe(false);
  });
  it("hay conflicto si alguien lo guardó después de abrirlo", () => {
    expect(hayConflicto(versionDe(t), new Date(t.getTime() + 5000))).toBe(true);
  });
  it("hay conflicto si se abrió como nuevo y mientras tanto lo creó otra persona", () => {
    expect(hayConflicto("0", t)).toBe(true);
  });
  it("una pantalla vieja sin versión se deja guardar", () => {
    expect(hayConflicto("", t)).toBe(false);
  });
  it("la hora se muestra en Argentina", () => {
    expect(horaArgentina(t)).toBe("18:18");
  });
});
