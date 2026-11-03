import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { libroAsistencia, libroEvaluaciones, libroMantenimiento, type FilaAsistencia, type FilaEvaluacion } from "../excel";

async function recargar(libro: ExcelJS.Workbook): Promise<ExcelJS.Workbook> {
  const copia = new ExcelJS.Workbook();
  await copia.xlsx.load((await libro.xlsx.writeBuffer()) as ArrayBuffer);
  return copia;
}

const asis = (fecha: string, categoria: string, alumno: string, presente: boolean, extra: Partial<FilaAsistencia> = {}): FilaAsistencia => ({
  fecha, categoria, tipo: "Entrenamiento", alumno, presente, minutos: null, nota: null, ...extra,
});

describe("libroAsistencia", () => {
  const filas = [
    asis("2026-10-03", "Optimist Escuela", "Ana Pérez", true, { minutos: 120 }),
    asis("2026-10-03", "Optimist Escuela", "Bruno Díaz", false),
    asis("2026-10-10", "Optimist Escuela", "Ana Pérez", true, { minutos: 90, nota: "=HYPERLINK(\"http://x\")" }),
    asis("2026-10-10", "420", "Carla Ríos", true),
  ];
  const alumnos = [
    { categoria: "Optimist Escuela", alumno: "Ana Pérez" },
    { categoria: "Optimist Escuela", alumno: "Bruno Díaz" },
    { categoria: "Optimist Escuela", alumno: "Dora Sin Salidas" },
    { categoria: "420", alumno: "Carla Ríos" },
  ];

  it("crea resumen, una planilla por categoría y detalle", async () => {
    const libro = await recargar(libroAsistencia(filas, alumnos));
    expect(libro.worksheets.map((h) => h.name)).toEqual(["Resumen", "Optimist Escuela", "420", "Detalle"]);
  });

  it("el resumen calcula salidas, presentes y porcentaje, y lista a quien no tuvo salidas", async () => {
    const hoja = (await recargar(libroAsistencia(filas, alumnos))).getWorksheet("Resumen")!;
    const fila = (n: string) => hoja.getRows(2, 10)!.find((r) => r.getCell(2).value === n)!;
    expect(fila("Ana Pérez").getCell(3).value).toBe(2); // salidas
    expect(fila("Ana Pérez").getCell(4).value).toBe(2); // presentes
    expect(fila("Bruno Díaz").getCell(6).value).toBe(0); // 0% de asistencia
    expect(fila("Dora Sin Salidas").getCell(3).value).toBe(0);
    // hay horas cargadas: aparece la columna y suma 120 + 90 minutos = 3:30 (en fracción de día)
    expect(hoja.getRow(1).getCell(7).value).toBe("Horas en el agua");
    const horas = fila("Ana Pérez").getCell(7).value as Date; // Excel guarda la duración como hora del día
    expect([horas.getUTCHours(), horas.getUTCMinutes()]).toEqual([3, 30]);
  });

  it("sin horarios cargados, no muestra la columna de horas", async () => {
    const sinHoras = filas.map((f) => ({ ...f, minutos: null }));
    const hoja = (await recargar(libroAsistencia(sinHoras, alumnos))).getWorksheet("Resumen")!;
    expect(hoja.getRow(1).values).not.toContain("Horas en el agua");
    expect(hoja.getRow(1).getCell(7).value).toBe("Última vez presente");
  });

  it("la planilla marca P/A por fecha, deja vacío lo no registrado y totaliza", async () => {
    const hoja = (await recargar(libroAsistencia(filas, alumnos))).getWorksheet("Optimist Escuela")!;
    // fila 2 = encabezados con fechas; B y C son 03/10 y 10/10
    expect(hoja.getCell("B3").value).toBe("P"); // Ana, 03/10
    expect(hoja.getCell("B4").value).toBe("A"); // Bruno, 03/10
    expect(hoja.getCell("C4").value).toBeNull(); // Bruno no figura el 10/10
    expect(hoja.getCell("D3").value).toBe(2); // presentes de Ana
    expect(hoja.getCell("E3").value).toBe(2); // salidas de Ana
    expect(hoja.getCell("F3").value).toBe(1); // 100%
    expect(hoja.getCell("A1").value).toBe("Optimist Escuela");
    expect(hoja.getCell("D1").value).toBe("Totales");
  });

  it("un texto que parece fórmula queda como texto, no se ejecuta", async () => {
    const hoja = (await recargar(libroAsistencia(filas, alumnos))).getWorksheet("Detalle")!;
    const celda = hoja.getRows(2, 10)!.map((r) => r.getCell(6)).find((c) => String(c.value).startsWith("=HYPERLINK"))!;
    expect(typeof celda.value).toBe("string");
  });

  it("sin datos genera hojas válidas con un aviso (no una tabla vacía)", async () => {
    const libro = await recargar(libroAsistencia([], []));
    expect(libro.getWorksheet("Resumen")!.getCell("A2").value).toMatch(/Todavía no hay/);
  });
});

describe("libroEvaluaciones", () => {
  const criterios = ["Técnica", "Táctica"];
  const ev = (fecha: string, alumno: string, a: number, b: number, comentario: string | null = null): FilaEvaluacion => ({
    fecha, categoria: "420", alumno, instructor: "Fran", promedio: (a + b) / 2, valores: { Técnica: a, Táctica: b }, comentario,
  });

  it("arma la tabla con una columna por criterio y la evolución por chico", async () => {
    const libro = await recargar(libroEvaluaciones([ev("2026-09-01", "Ana", 4, 6), ev("2026-10-01", "Ana", 8, 8, "Muy bien"), ev("2026-10-01", "Beto", 5, 5)], criterios));
    const hoja = libro.getWorksheet("Evaluaciones")!;
    expect(hoja.getRow(1).values).toEqual([undefined, "Fecha", "Categoría", "Alumno", "Evaluó", "Promedio", "Técnica", "Táctica", "Comentario"]);
    expect(hoja.getCell("E3").value).toBe(8);
    expect(hoja.getCell("H3").value).toBe("Muy bien");
    const evol = libro.getWorksheet("Evolución")!;
    const ana = evol.getRows(2, 5)!.find((r) => r.getCell(2).value === "Ana")!;
    expect(ana.getCell(3).value).toBe(2); // evaluaciones
    expect(ana.getCell(6).value).toBe(5); // primera nota
    expect(ana.getCell(7).value).toBe(8); // última nota
    expect(ana.getCell(8).value).toBe(3); // cambio
    const beto = evol.getRows(2, 5)!.find((r) => r.getCell(2).value === "Beto")!;
    expect(beto.getCell(8).value).toBeNull(); // con una sola evaluación no hay cambio
  });

  it("sin evaluaciones deja el aviso", async () => {
    const libro = await recargar(libroEvaluaciones([], criterios));
    expect(libro.getWorksheet("Evaluaciones")!.getCell("A2").value).toMatch(/Todavía no hay/);
  });
});

describe("libroMantenimiento", () => {
  it("arma la tabla con costos y la hoja de gasto por bote, y sobrevive a recargarse", async () => {
    const libro = await recargar(
      libroMantenimiento([
        { bote: "Bote 2", fecha: "2026-11-02", descripcion: "Pierde aire el flotador", urgente: true, estado: "Pendiente", cargo: "Fran", resueltoEn: null, dias: 3, solucion: null, arreglo: null, costo: null },
        { bote: "Bote 7", fecha: "2026-10-01", descripcion: "Motor se ahoga", urgente: false, estado: "Arreglado", cargo: "Fran", resueltoEn: "2026-10-05", dias: 4, solucion: "Limpieza de carburador", arreglo: "Ana", costo: 25000 },
        { bote: "Bote 7", fecha: "2026-10-10", descripcion: "Boza deshilachada", urgente: false, estado: "Arreglado", cargo: "Ana", resueltoEn: "2026-10-11", dias: 1, solucion: null, arreglo: "Ana", costo: 5000 },
      ]),
    );
    const hoja = libro.getWorksheet("Mantenimiento")!;
    expect(hoja.rowCount).toBe(4);
    expect(hoja.getCell("A2").value).toBe("Bote 2");
    expect(hoja.getCell("E2").value).toBe("Pendiente");
    expect(hoja.getCell("K3").value).toBe(25000);
    const gastos = libro.getWorksheet("Gasto por bote")!;
    expect(gastos.getCell("A3").value).toBe("Bote 7");
    expect(gastos.getCell("E3").value).toBe(30000);
  });
  it("sin datos deja el aviso en vez de una tabla vacía", async () => {
    const hoja = (await recargar(libroMantenimiento([]))).getWorksheet("Mantenimiento")!;
    expect(hoja.getCell("A2").value).toBe("Todavía no hay observaciones cargadas.");
  });
});
