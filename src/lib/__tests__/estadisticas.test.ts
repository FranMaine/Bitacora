import { describe, it, expect } from "vitest";
import { resumir, type EntrenamientoResumen } from "../estadisticas";

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
