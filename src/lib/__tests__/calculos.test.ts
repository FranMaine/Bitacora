import { describe, it, expect } from "vitest";
import { minutosEntre, formatoDuracion, porcentaje, promedio, formatoNota, rachaAusencias, barras, diasEntre, horaValida } from "../calculos";
import { hoyAR, aFechaDB, sumarDias, periodoAnterior, periodoSiguiente, periodoCorto, nombrePeriodo, fechaLarga } from "../fechas";

describe("minutosEntre", () => {
  it("calcula la duración entre bajada y regreso", () => {
    expect(minutosEntre("10:00", "13:30")).toBe(210);
    expect(minutosEntre("09:15", "09:45")).toBe(30);
  });
  it("devuelve null si falta una hora, es inválida o el regreso no es posterior", () => {
    expect(minutosEntre(null, "13:00")).toBeNull();
    expect(minutosEntre("10:00", undefined)).toBeNull();
    expect(minutosEntre("25:00", "26:00")).toBeNull();
    expect(minutosEntre("13:00", "10:00")).toBeNull();
    expect(minutosEntre("10:00", "10:00")).toBeNull();
  });
});

describe("formatoDuracion", () => {
  it("formatea horas y minutos", () => {
    expect(formatoDuracion(150)).toBe("2 h 30 min");
    expect(formatoDuracion(45)).toBe("45 min");
    expect(formatoDuracion(120)).toBe("2 h");
  });
});

describe("porcentaje / promedio / formatoNota", () => {
  it("porcentaje redondea y tolera total 0", () => {
    expect(porcentaje(2, 3)).toBe(67);
    expect(porcentaje(0, 0)).toBeNull();
  });
  it("promedio y formato argentino", () => {
    expect(promedio([])).toBeNull();
    expect(promedio([6, 8])).toBe(7);
    expect(formatoNota(7.25)).toBe("7,3");
    expect(formatoNota(7)).toBe("7");
    expect(formatoNota(null)).toBe("—");
  });
});

describe("rachaAusencias", () => {
  it("cuenta ausencias seguidas desde el más reciente", () => {
    expect(rachaAusencias([false, false, true, false])).toBe(2);
    expect(rachaAusencias([true, false, false])).toBe(0);
    expect(rachaAusencias([])).toBe(0);
  });
});

describe("barras / diasEntre / horaValida", () => {
  it("escala las barras contra el máximo", () => {
    expect(barras([{ valor: 10 }, { valor: 5 }, { valor: 0 }]).map((b) => b.ancho)).toEqual([100, 50, 0]);
    expect(barras([{ valor: 0 }]).map((b) => b.ancho)).toEqual([0]);
  });
  it("diasEntre", () => {
    expect(diasEntre("2026-10-01", "2026-10-24")).toBe(23);
  });
  it("horaValida", () => {
    expect(horaValida("09:05")).toBe(true);
    expect(horaValida("9:05")).toBe(false);
  });
});

describe("fechas", () => {
  it("hoyAR usa la hora de Argentina (UTC-3)", () => {
    // 01:00 UTC del 25/10 todavía es 22:00 del 24/10 en Argentina
    expect(hoyAR(new Date("2026-10-25T01:00:00Z"))).toBe("2026-10-24");
    expect(hoyAR(new Date("2026-10-25T12:00:00Z"))).toBe("2026-10-25");
  });
  it("aFechaDB valida", () => {
    expect(aFechaDB("2026-10-24")?.toISOString()).toBe("2026-10-24T00:00:00.000Z");
    expect(aFechaDB("2026-02-30")).toBeNull();
    expect(aFechaDB("24/10/2026")).toBeNull();
  });
  it("sumarDias y períodos", () => {
    expect(sumarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
    expect(periodoAnterior("2026-01")).toBe("2025-12");
    expect(periodoAnterior("2026-10")).toBe("2026-09");
    expect(periodoSiguiente("2026-12")).toBe("2027-01");
    expect(periodoSiguiente("2026-10")).toBe("2026-11");
    expect(periodoCorto("2026-10")).toBe("oct 26");
    expect(nombrePeriodo("2026-10")).toBe("octubre 2026");
    expect(fechaLarga("2026-10-24")).toBe("sábado, 24 de octubre");
  });
});
