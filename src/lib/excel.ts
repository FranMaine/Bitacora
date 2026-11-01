import ExcelJS from "exceljs";

// Libros de Excel (.xlsx) con formato: encabezados de color, anchos de columna ajustados al contenido
// (nada se superpone ni se corta), filtros, paneles fijos y colores para leer de un vistazo.
// Reciben datos planos para poder probarse sin base de datos.

const COLOR = {
  acento: "FF0B5F8F",
  acentoSuave: "FFE3F0F8",
  borde: "FFD0D7DE",
  ok: "FFDDF3E6",
  okTexto: "FF1D7A4A",
  mal: "FFFBE3E1",
  malTexto: "FFB4261F",
  alerta: "FFFDF0D5",
  alertaTexto: "FFA4560B",
  gris: "FFF3F5F7",
  texto: "FF14181C",
};

const FUENTE = { name: "Calibri", size: 11, color: { argb: COLOR.texto } };
const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: COLOR.borde } },
  left: { style: "thin", color: { argb: COLOR.borde } },
  bottom: { style: "thin", color: { argb: COLOR.borde } },
  right: { style: "thin", color: { argb: COLOR.borde } },
};
const FORMATO_FECHA = "dd/mm/yyyy";

const aFecha = (f: string) => new Date(`${f}T00:00:00.000Z`);
const mesLargo = (f: string) => {
  const m = new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(aFecha(f));
  return m.charAt(0).toUpperCase() + m.slice(1);
};

/** Ancho de columna (en caracteres) según el contenido más largo, entre un mínimo y un máximo. */
function ancho(valores: unknown[], minimo: number, maximo: number): number {
  const mayor = valores.reduce<number>((m, v) => {
    const largo = v instanceof Date ? 10 : String(v ?? "").split("\n").reduce((a, l) => Math.max(a, l.length), 0);
    return Math.max(m, largo);
  }, 0);
  return Math.min(maximo, Math.max(minimo, Math.ceil(mayor * 1.1) + 2));
}

function nuevoLibro(): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Bitácora CVSI";
  libro.created = new Date();
  return libro;
}

function estiloEncabezado(celda: ExcelJS.Cell) {
  celda.font = { ...FUENTE, bold: true, color: { argb: "FFFFFFFF" } };
  celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.acento } };
  celda.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  celda.border = BORDE;
}

type Columna = {
  titulo: string;
  /** "texto" alinea a la izquierda; el resto, al centro */
  tipo?: "texto" | "numero" | "fecha" | "porcentaje" | "horas";
  formato?: string;
  envolver?: boolean;
  anchoMin?: number;
  anchoMax?: number;
};

/**
 * Hoja con una tabla de Excel (filtros, filas alternadas) y el formato ya aplicado.
 * Si no hay filas, deja los encabezados y una línea de aviso (una tabla vacía rompe Excel).
 */
function hojaTabla(libro: ExcelJS.Workbook, nombreHoja: string, nombreTabla: string, columnas: Columna[], filas: unknown[][], avisoVacio: string) {
  const hoja = libro.addWorksheet(nombreHoja, { views: [{ state: "frozen", ySplit: 1 }] });
  if (filas.length === 0) {
    hoja.addRow(columnas.map((c) => c.titulo)).eachCell(estiloEncabezado);
    hoja.addRow([avisoVacio]).getCell(1).font = { ...FUENTE, italic: true };
    columnas.forEach((c, i) => (hoja.getColumn(i + 1).width = ancho([c.titulo], c.anchoMin ?? 12, 30)));
    return hoja;
  }

  hoja.addTable({
    name: nombreTabla,
    ref: "A1",
    headerRow: true,
    style: { theme: "TableStyleLight1", showRowStripes: false },
    columns: columnas.map((c) => ({ name: c.titulo, filterButton: true })),
    rows: filas as ExcelJS.CellValue[][],
  });

  hoja.getRow(1).height = 30;
  columnas.forEach((c, i) => {
    const col = hoja.getColumn(i + 1);
    col.width = ancho([c.titulo, ...filas.map((f) => f[i])], c.anchoMin ?? 10, c.anchoMax ?? 40);
    estiloEncabezado(hoja.getCell(1, i + 1));
  });

  filas.forEach((_, r) => {
    const fila = hoja.getRow(r + 2);
    columnas.forEach((c, i) => {
      const celda = fila.getCell(i + 1);
      celda.font = FUENTE;
      celda.border = BORDE;
      const tipo = c.tipo ?? "texto";
      celda.alignment = { vertical: "middle", horizontal: tipo === "texto" ? "left" : "center", wrapText: Boolean(c.envolver) };
      if (tipo === "fecha") celda.numFmt = c.formato ?? FORMATO_FECHA;
      else if (tipo === "porcentaje") celda.numFmt = c.formato ?? "0%";
      else if (tipo === "horas") celda.numFmt = c.formato ?? "[h]:mm";
      else if (c.formato) celda.numFmt = c.formato;
      // filas alternadas a mano (el estilo de la tabla de Excel no se aplica en todos los programas)
      if (r % 2 === 1) celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.gris } };
    });
  });
  return hoja;
}

function reglaTexto(fondo: string, texto: string): Partial<ExcelJS.Style> {
  return { font: { color: { argb: texto }, bold: true }, fill: { type: "pattern", pattern: "solid", bgColor: { argb: fondo } } };
}

// =====================================================================================
// ASISTENCIA
// =====================================================================================

export type FilaAsistencia = {
  fecha: string; // "YYYY-MM-DD"
  categoria: string;
  tipo: "Entrenamiento" | "Regata";
  alumno: string;
  presente: boolean;
  /** minutos en el agua de esa salida (se cuentan solo si estuvo presente) */
  minutos: number | null;
  nota: string | null;
};

export type AlumnoDeCategoria = { categoria: string; alumno: string };

export function libroAsistencia(filas: FilaAsistencia[], alumnos: AlumnoDeCategoria[]): ExcelJS.Workbook {
  const libro = nuevoLibro();

  // ---- orden de categorías según aparecen en la lista de alumnos, y luego las que falten
  const categorias = [...new Set([...alumnos.map((a) => a.categoria), ...filas.map((f) => f.categoria)])];

  // ---- 1) Resumen por chico
  const claves = new Map<string, { categoria: string; alumno: string }>();
  for (const a of alumnos) claves.set(`${a.categoria}|${a.alumno}`, a);
  for (const f of filas) claves.set(`${f.categoria}|${f.alumno}`, { categoria: f.categoria, alumno: f.alumno });
  const hayHoras = filas.some((f) => f.presente && (f.minutos ?? 0) > 0);
  const filasResumen = [...claves.entries()]
    .sort(([, a], [, b]) => categorias.indexOf(a.categoria) - categorias.indexOf(b.categoria) || a.alumno.localeCompare(b.alumno, "es"))
    .map(([clave, a]) => {
      const propias = filas.filter((f) => `${f.categoria}|${f.alumno}` === clave);
      const presentes = propias.filter((f) => f.presente);
      const minutos = presentes.reduce((s, f) => s + (f.minutos ?? 0), 0);
      const ultima = presentes.map((f) => f.fecha).sort().at(-1);
      return [
        a.categoria,
        a.alumno,
        propias.length,
        presentes.length,
        propias.length - presentes.length,
        propias.length ? presentes.length / propias.length : null,
        ...(hayHoras ? [minutos ? minutos / 1440 : null] : []),
        ultima ? aFecha(ultima) : null,
      ];
    });
  const resumen = hojaTabla(
    libro,
    "Resumen",
    "TablaResumen",
    [
      { titulo: "Categoría", anchoMin: 14 },
      { titulo: "Alumno", anchoMin: 16 },
      { titulo: "Salidas", tipo: "numero", anchoMin: 9 },
      { titulo: "Presentes", tipo: "numero", anchoMin: 11 },
      { titulo: "Ausentes", tipo: "numero", anchoMin: 10 },
      { titulo: "Asistencia", tipo: "porcentaje", anchoMin: 12 },
      ...(hayHoras ? [{ titulo: "Horas en el agua", tipo: "horas" as const, anchoMin: 16 }] : []),
      { titulo: "Última vez presente", tipo: "fecha" as const, anchoMin: 19 },
    ],
    filasResumen,
    "Todavía no hay asistencias cargadas.",
  );
  if (filasResumen.length) {
    resumen.addConditionalFormatting({
      ref: `F2:F${filasResumen.length + 1}`,
      rules: [
        { type: "cellIs", operator: "lessThan", formulae: [0.5], priority: 1, style: reglaTexto(COLOR.mal, COLOR.malTexto) },
        { type: "cellIs", operator: "between", formulae: [0.5, 0.7499], priority: 2, style: reglaTexto(COLOR.alerta, COLOR.alertaTexto) },
        { type: "cellIs", operator: "greaterThan", formulae: [0.7499], priority: 3, style: reglaTexto(COLOR.ok, COLOR.okTexto) },
      ],
    });
  }

  // ---- 2) Una planilla por categoría: chicos en filas, fechas en columnas (como la planilla del club)
  for (const categoria of categorias) {
    const deCategoria = filas.filter((f) => f.categoria === categoria);
    if (deCategoria.length === 0) continue;
    const fechas = [...new Set(deCategoria.map((f) => f.fecha))].sort();
    const nombres = [...new Set([...alumnos.filter((a) => a.categoria === categoria).map((a) => a.alumno), ...deCategoria.map((f) => f.alumno)])].sort((a, b) => a.localeCompare(b, "es"));
    const valor = new Map(deCategoria.map((f) => [`${f.alumno}|${f.fecha}`, f.presente]));

    const hoja = libro.addWorksheet(categoria.slice(0, 31).replace(/[\\/?*[\]:]/g, " "), {
      views: [{ state: "frozen", xSplit: 1, ySplit: 2 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    const colFechas = (i: number) => i + 2; // columna B en adelante
    const colTot = colFechas(fechas.length); // Presentes, Salidas, Asistencia
    const anchoNombre = ancho(["Alumno", ...nombres, "Presentes ese día"], 18, 34);

    // fila 1: meses (combinados) · fila 2: encabezados con fechas en vertical
    hoja.getCell(1, 1).value = categoria;
    hoja.mergeCells(1, 1, 2, 1);
    estiloEncabezado(hoja.getCell(1, 1));
    hoja.getColumn(1).width = anchoNombre;
    let inicio = 0;
    for (let i = 0; i <= fechas.length; i++) {
      if (i === fechas.length || mesLargo(fechas[i]) !== mesLargo(fechas[inicio])) {
        const desde = colFechas(inicio);
        const hasta = colFechas(i - 1);
        const celda = hoja.getCell(1, desde);
        celda.value = mesLargo(fechas[inicio]);
        if (hasta > desde) hoja.mergeCells(1, desde, 1, hasta);
        celda.font = { ...FUENTE, bold: true, color: { argb: COLOR.acento } };
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.acentoSuave } };
        celda.alignment = { horizontal: "center", vertical: "middle" };
        celda.border = BORDE;
        inicio = i;
      }
    }
    fechas.forEach((f, i) => {
      const celda = hoja.getCell(2, colFechas(i));
      celda.value = aFecha(f);
      celda.numFmt = "dd/mm";
      estiloEncabezado(celda);
      celda.alignment = { textRotation: 90, horizontal: "center", vertical: "middle" };
      hoja.getColumn(colFechas(i)).width = 4.3;
    });
    ["Presentes", "Salidas", "Asistencia"].forEach((t, k) => {
      const celda = hoja.getCell(2, colTot + k);
      celda.value = t;
      estiloEncabezado(celda);
      hoja.getColumn(colTot + k).width = k === 2 ? 12 : 11;
    });
    const celdaTot = hoja.getCell(1, colTot);
    celdaTot.value = "Totales";
    hoja.mergeCells(1, colTot, 1, colTot + 2);
    celdaTot.font = { ...FUENTE, bold: true, color: { argb: COLOR.acento } };
    celdaTot.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.acentoSuave } };
    celdaTot.alignment = { horizontal: "center", vertical: "middle" };
    celdaTot.border = BORDE;
    hoja.getRow(1).height = 20;
    hoja.getRow(2).height = 44; // alcanza para "31/12" girado

    // chicos
    nombres.forEach((n, r) => {
      const fila = r + 3;
      const nom = hoja.getCell(fila, 1);
      nom.value = n;
      nom.font = FUENTE;
      nom.border = BORDE;
      nom.alignment = { vertical: "middle" };
      let presentes = 0;
      let salidas = 0;
      fechas.forEach((f, i) => {
        const v = valor.get(`${n}|${f}`);
        const celda = hoja.getCell(fila, colFechas(i));
        celda.border = BORDE;
        celda.alignment = { horizontal: "center", vertical: "middle" };
        celda.font = FUENTE;
        if (v === undefined) return;
        salidas++;
        if (v) presentes++;
        celda.value = v ? "P" : "A";
        celda.font = { ...FUENTE, bold: true, color: { argb: v ? COLOR.okTexto : COLOR.malTexto } };
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: v ? COLOR.ok : COLOR.mal } };
      });
      [presentes, salidas, salidas ? presentes / salidas : null].forEach((val, k) => {
        const celda = hoja.getCell(fila, colTot + k);
        celda.value = val;
        celda.font = { ...FUENTE, bold: true };
        celda.border = BORDE;
        celda.alignment = { horizontal: "center", vertical: "middle" };
        if (k === 2) celda.numFmt = "0%";
      });
    });

    // pie: cuántos vinieron cada día
    const pie = nombres.length + 3;
    const rotulo = hoja.getCell(pie, 1);
    rotulo.value = "Presentes ese día";
    rotulo.font = { ...FUENTE, bold: true };
    rotulo.border = BORDE;
    rotulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.acentoSuave } };
    fechas.forEach((f, i) => {
      const celda = hoja.getCell(pie, colFechas(i));
      celda.value = deCategoria.filter((x) => x.fecha === f && x.presente).length;
      celda.font = { ...FUENTE, bold: true };
      celda.border = BORDE;
      celda.alignment = { horizontal: "center" };
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.acentoSuave } };
    });
  }

  // ---- 3) Detalle (una fila por chico y salida), filtrable
  const detalle = [...filas]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || categorias.indexOf(a.categoria) - categorias.indexOf(b.categoria) || a.alumno.localeCompare(b.alumno, "es"))
    .map((f) => [aFecha(f.fecha), f.categoria, f.tipo, f.alumno, f.presente ? "Presente" : "Ausente", f.nota]);
  const hojaDetalle = hojaTabla(
    libro,
    "Detalle",
    "TablaDetalle",
    [
      { titulo: "Fecha", tipo: "fecha", anchoMin: 12 },
      { titulo: "Categoría", anchoMin: 14 },
      { titulo: "Tipo", anchoMin: 14 },
      { titulo: "Alumno", anchoMin: 16 },
      { titulo: "Asistencia", tipo: "numero", anchoMin: 12 },
      { titulo: "Observación", envolver: true, anchoMin: 20, anchoMax: 55 },
    ],
    detalle,
    "Todavía no hay asistencias cargadas.",
  );
  if (detalle.length) {
    hojaDetalle.addConditionalFormatting({
      ref: `E2:E${detalle.length + 1}`,
      rules: [
        { type: "cellIs", operator: "equal", formulae: ['"Presente"'], priority: 1, style: reglaTexto(COLOR.ok, COLOR.okTexto) },
        { type: "cellIs", operator: "equal", formulae: ['"Ausente"'], priority: 2, style: reglaTexto(COLOR.mal, COLOR.malTexto) },
      ],
    });
  }
  return libro;
}

// =====================================================================================
// EVALUACIONES
// =====================================================================================

export type FilaEvaluacion = {
  fecha: string;
  categoria: string;
  alumno: string;
  instructor: string;
  promedio: number | null;
  /** nota por nombre de criterio */
  valores: Record<string, number>;
  comentario: string | null;
};

export function libroEvaluaciones(filas: FilaEvaluacion[], criterios: string[]): ExcelJS.Workbook {
  const libro = nuevoLibro();

  const filasTabla = filas.map((e) => [
    aFecha(e.fecha),
    e.categoria,
    e.alumno,
    e.instructor,
    e.promedio === null ? null : Math.round(e.promedio * 10) / 10,
    ...criterios.map((c) => e.valores[c] ?? null),
    e.comentario,
  ]);
  const hoja = hojaTabla(
    libro,
    "Evaluaciones",
    "TablaEvaluaciones",
    [
      { titulo: "Fecha", tipo: "fecha", anchoMin: 12 },
      { titulo: "Categoría", anchoMin: 14 },
      { titulo: "Alumno", anchoMin: 16 },
      { titulo: "Evaluó", anchoMin: 12 },
      { titulo: "Promedio", tipo: "numero", formato: "0.0", anchoMin: 11 },
      // cada criterio: ancho para que entre el título completo en dos renglones, sin pisar al vecino
      ...criterios.map<Columna>((c) => ({ titulo: c, tipo: "numero", anchoMin: 12, anchoMax: 16 })),
      { titulo: "Comentario", envolver: true, anchoMin: 24, anchoMax: 60 },
    ],
    filasTabla,
    "Todavía no hay evaluaciones cargadas.",
  );
  if (filasTabla.length) {
    // mismas tonalidades de la app: rojo claro hasta 4, ámbar de 5 a 7 y verde desde 8
    // el promedio (columna E) y cada criterio llevan color según la nota
    const hasta = 5 + criterios.length;
    {
      hoja.addConditionalFormatting({
        ref: `E2:${columnaLetra(hasta)}${filasTabla.length + 1}`,
        rules: [
          { type: "cellIs", operator: "lessThan", formulae: [5], priority: 1, style: reglaTexto(COLOR.mal, COLOR.malTexto) },
          { type: "cellIs", operator: "between", formulae: [5, 7.9999], priority: 2, style: reglaTexto(COLOR.alerta, COLOR.alertaTexto) },
          { type: "cellIs", operator: "greaterThan", formulae: [7.9999], priority: 3, style: reglaTexto(COLOR.ok, COLOR.okTexto) },
        ],
      });
    }
  }

  // ---- evolución: primera y última nota de cada chico
  const porAlumno = new Map<string, FilaEvaluacion[]>();
  for (const e of [...filas].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const clave = `${e.categoria}|${e.alumno}`;
    porAlumno.set(clave, [...(porAlumno.get(clave) ?? []), e]);
  }
  const evolucion = [...porAlumno.values()]
    .map((lista) => {
      const notas = lista.map((e) => e.promedio).filter((n): n is number => n !== null);
      const primera = notas[0];
      const ultima = notas.at(-1);
      return [
        lista[0].categoria,
        lista[0].alumno,
        lista.length,
        aFecha(lista[0].fecha),
        aFecha(lista.at(-1)!.fecha),
        primera === undefined ? null : Math.round(primera * 10) / 10,
        ultima === undefined ? null : Math.round(ultima * 10) / 10,
        primera !== undefined && ultima !== undefined && notas.length > 1 ? Math.round((ultima - primera) * 10) / 10 : null,
      ];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "es") || String(a[1]).localeCompare(String(b[1]), "es"));
  const hojaEvol = hojaTabla(
    libro,
    "Evolución",
    "TablaEvolucion",
    [
      { titulo: "Categoría", anchoMin: 14 },
      { titulo: "Alumno", anchoMin: 16 },
      { titulo: "Evaluaciones", tipo: "numero", anchoMin: 14 },
      { titulo: "Primera evaluación", tipo: "fecha", anchoMin: 19 },
      { titulo: "Última evaluación", tipo: "fecha", anchoMin: 18 },
      { titulo: "Primera nota", tipo: "numero", formato: "0.0", anchoMin: 13 },
      { titulo: "Última nota", tipo: "numero", formato: "0.0", anchoMin: 12 },
      { titulo: "Cambio", tipo: "numero", formato: "+0.0;-0.0;0.0", anchoMin: 10 },
    ],
    evolucion,
    "Todavía no hay evaluaciones cargadas.",
  );
  if (evolucion.length) {
    hojaEvol.addConditionalFormatting({
      ref: `H2:H${evolucion.length + 1}`,
      rules: [
        { type: "cellIs", operator: "greaterThan", formulae: [0], priority: 1, style: reglaTexto(COLOR.ok, COLOR.okTexto) },
        { type: "cellIs", operator: "lessThan", formulae: [0], priority: 2, style: reglaTexto(COLOR.mal, COLOR.malTexto) },
      ],
    });
  }
  return libro;
}

/** 1 -> A, 27 -> AA */
function columnaLetra(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
