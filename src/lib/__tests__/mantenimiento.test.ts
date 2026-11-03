import { describe, it, expect } from "vitest";
import { formatoPesos, gastoTotal, diasPendiente, diasQueTardo, haceDias, resumenMantenimiento, tardoTexto } from "../mantenimiento";

describe("textos de días", () => {
  it("haceDias y tardoTexto", () => {
    expect(haceDias(0)).toBe("hoy");
    expect(haceDias(1)).toBe("hace 1 día");
    expect(haceDias(12)).toBe("hace 12 días");
    expect(tardoTexto(0)).toBe("el mismo día");
    expect(tardoTexto(1)).toBe("en 1 día");
    expect(tardoTexto(5)).toBe("en 5 días");
  });
  it("los días nunca son negativos", () => {
    expect(diasPendiente("2026-11-05", "2026-11-02")).toBe(0);
    expect(diasQueTardo("2026-11-02", "2026-11-12")).toBe(10);
  });
});

describe("resumenMantenimiento", () => {
  const hoy = "2026-11-10";
  it("cuenta pendientes, urgentes y el tiempo medio de arreglo", () => {
    const r = resumenMantenimiento(
      [
        { estado: "PENDIENTE", urgente: true, fecha: "2026-11-01", resueltoEn: null },
        { estado: "PENDIENTE", urgente: false, fecha: "2026-11-08", resueltoEn: null },
        { estado: "ARREGLADO", urgente: false, fecha: "2026-10-01", resueltoEn: "2026-10-05" }, // 4 días
        { estado: "ARREGLADO", urgente: true, fecha: "2026-10-10", resueltoEn: "2026-10-12" }, // 2 días
      ],
      hoy,
    );
    expect(r).toEqual({ pendientes: 2, urgentes: 1, arreglados: 2, diasMedios: 3, pendienteMasViejo: 9 });
  });
  it("sin datos no hay promedios", () => {
    expect(resumenMantenimiento([], hoy)).toEqual({ pendientes: 0, urgentes: 0, arreglados: 0, diasMedios: null, pendienteMasViejo: null });
  });
});

describe("costos", () => {
  it("formatea pesos y suma solo los costos cargados", () => {
    expect(formatoPesos(12500)).toBe("$ 12.500");
    expect(formatoPesos(0)).toBe("$ 0");
    expect(gastoTotal([{ costo: 1000 }, { costo: null }, { costo: 2500 }])).toBe(3500);
    expect(gastoTotal([])).toBe(0);
  });
});
