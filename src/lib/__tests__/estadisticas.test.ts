import { describe, it, expect } from "vitest";
import { resumir, avanceEvaluaciones, resumenFases, type EntrenamientoResumen, type EvaluacionSimple } from "../estadisticas";

const base = { horaBajada: "10:00", horaRegreso: "12:00", presentes: 8, total: 10, temasHechos: [] as string[] };

describe("resumir", () => {
  it("suma horas, asistencia y cuenta entrenamientos por categoría", () => {
    const es: EntrenamientoResumen[] = [
      { ...base, fecha: "2026-10-03", categoriaId: "a" },
      { ...base, fecha: "2026-10-10", categoriaId: "a", horaRegreso: "11:30", presentes: 10 },
      { ...base, fecha: "2026-10-10", categoriaId: "b", horaBajada: null, presentes: 5, total: 5 },
    ];
    const r = resumir(es);
    expect(r.cantidad).toBe(3);
    expect(r.minutos).toBe(120 + 90); // el que no tiene horario no suma horas
    expect(r.asistenciaPct).toBe(Math.round((23 / 25) * 100));
    expect(r.porCategoria.get("a")).toEqual({ cantidad: 2, minutos: 210, presentes: 18, total: 20 });
    expect(r.porCategoria.get("b")).toEqual({ cantidad: 1, minutos: 0, presentes: 5, total: 5 });
  });

  it("cuenta cada tema una vez por entrenamiento y guarda la última fecha", () => {
    const r = resumir([
      { ...base, fecha: "2026-10-10", categoriaId: "a", temasHechos: ["popa", "popa", "cenida"] },
      { ...base, fecha: "2026-10-03", categoriaId: "a", temasHechos: ["popa"] },
    ]);
    expect(r.temas.get("popa")).toEqual({ veces: 2, ultima: "2026-10-10" });
    expect(r.temas.get("cenida")).toEqual({ veces: 1, ultima: "2026-10-10" });
  });

  it("sin entrenamientos no hay porcentaje", () => {
    const r = resumir([]);
    expect(r.cantidad).toBe(0);
    expect(r.asistenciaPct).toBeNull();
  });
});

const ev = (alumnoId: string, fecha: string, a: number, b: number): EvaluacionSimple => ({
  alumnoId,
  fecha,
  items: [
    { criterioId: "c1", nombre: "Técnica", valor: a },
    { criterioId: "c2", nombre: "Táctica", valor: b },
  ],
});

describe("avanceEvaluaciones", () => {
  it("compara la última evaluación de cada alumno con la anterior", () => {
    const r = avanceEvaluaciones([
      ev("x", "2026-09-01", 4, 4), ev("x", "2026-10-01", 6, 6), // mejoró +2
      ev("y", "2026-09-05", 7, 7), ev("y", "2026-10-05", 7, 7), // igual
      ev("z", "2026-09-10", 8, 6), ev("z", "2026-10-10", 6, 6), // bajó -1
      ev("w", "2026-10-10", 9, 9), // una sola: no se compara
    ]);
    expect(r.comparados).toBe(3);
    expect([r.mejoraron, r.iguales, r.bajaron]).toEqual([1, 1, 1]);
    expect(r.deltaMedio).toBeCloseTo((2 + 0 - 1) / 3);
    const tecnica = r.porCriterio.find((c) => c.nombre === "Técnica")!;
    expect(tecnica.anterior).toBeCloseTo((4 + 7 + 8) / 3);
    expect(tecnica.actual).toBeCloseTo((6 + 7 + 6) / 3);
  });

  it("usa la última y la anterior aunque haya más evaluaciones, sin importar el orden de entrada", () => {
    const r = avanceEvaluaciones([ev("x", "2026-10-01", 6, 6), ev("x", "2026-08-01", 1, 1), ev("x", "2026-09-01", 4, 4)]);
    expect(r.comparados).toBe(1);
    expect(r.deltaMedio).toBe(2); // 6 vs 4, no vs 1
  });

  it("sin alumnos comparables no hay promedio", () => {
    const r = avanceEvaluaciones([ev("x", "2026-10-01", 5, 5)]);
    expect(r.comparados).toBe(0);
    expect(r.deltaMedio).toBeNull();
  });
});

describe("resumenFases", () => {
  const n = (faseId: string, orden: number, valor: number) => ({ faseId, nombre: faseId, orden, valor });
  it("cuenta malas, regulares y bien por fase y ordena las más flojas primero", () => {
    const r = resumenFases([n("largada", 0, 1), n("largada", 0, 2), n("popa", 4, 3), n("popa", 4, 3), n("popa", 4, 2)]);
    expect(r.map((f) => f.faseId)).toEqual(["largada", "popa"]);
    expect(r[0]).toMatchObject({ malas: 1, regulares: 1, bien: 0, total: 2, pctBien: 0, promedio: 1.5 });
    expect(r[1]).toMatchObject({ malas: 0, regulares: 1, bien: 2, total: 3, pctBien: 67 });
  });
  it("ignora valores fuera de 1-3 y tolera la lista vacía", () => {
    expect(resumenFases([])).toEqual([]);
    expect(resumenFases([n("x", 0, 9)])).toEqual([]);
  });
});
