import { minutosEntre, porcentaje } from "./calculos";

export type EntrenamientoResumen = {
  fecha: string; // "YYYY-MM-DD"
  categoriaId: string;
  horaBajada: string | null;
  horaRegreso: string | null;
  presentes: number;
  total: number; // alumnos listados en la asistencia
  temasHechos: string[]; // ids de tema
};

export type ResumenCategoria = { cantidad: number; minutos: number; presentes: number; total: number };

export type Resumen = {
  cantidad: number;
  minutos: number;
  asistenciaPct: number | null;
  porCategoria: Map<string, ResumenCategoria>;
  /** veces que se entrenó cada tema y la última fecha en que se hizo */
  temas: Map<string, { veces: number; ultima: string }>;
};

/** Junta los entrenamientos realizados en totales de horas, asistencia y temas. */
export function resumir(entrenamientos: EntrenamientoResumen[]): Resumen {
  const porCategoria = new Map<string, ResumenCategoria>();
  const temas = new Map<string, { veces: number; ultima: string }>();
  let minutos = 0;
  let presentes = 0;
  let total = 0;

  for (const e of entrenamientos) {
    const m = minutosEntre(e.horaBajada, e.horaRegreso) ?? 0;
    minutos += m;
    presentes += e.presentes;
    total += e.total;

    const c = porCategoria.get(e.categoriaId) ?? { cantidad: 0, minutos: 0, presentes: 0, total: 0 };
    c.cantidad += 1;
    c.minutos += m;
    c.presentes += e.presentes;
    c.total += e.total;
    porCategoria.set(e.categoriaId, c);

    for (const t of new Set(e.temasHechos)) {
      const previo = temas.get(t);
      temas.set(t, { veces: (previo?.veces ?? 0) + 1, ultima: previo && previo.ultima > e.fecha ? previo.ultima : e.fecha });
    }
  }

  return { cantidad: entrenamientos.length, minutos, asistenciaPct: porcentaje(presentes, total), porCategoria, temas };
}

export type EvaluacionSimple = {
  alumnoId: string;
  fecha: string; // "YYYY-MM-DD"
  items: { criterioId: string; nombre: string; valor: number }[];
};

export type Avance = {
  /** alumnos con al menos dos evaluaciones (los únicos que se pueden comparar) */
  comparados: number;
  mejoraron: number;
  iguales: number;
  bajaron: number;
  /** promedio de las diferencias (última − anterior) de los alumnos comparados */
  deltaMedio: number | null;
  /** por criterio: promedio de la evaluación anterior vs la última, solo de alumnos comparados */
  porCriterio: { nombre: string; anterior: number; actual: number; delta: number }[];
};

const margen = 0.05;

/**
 * Compara, para cada alumno, su ÚLTIMA evaluación con la ANTERIOR. Sirve para
 * responder "¿está mejorando?" sin mirar alumno por alumno.
 */
export function avanceEvaluaciones(evaluaciones: EvaluacionSimple[]): Avance {
  const porAlumno = new Map<string, EvaluacionSimple[]>();
  for (const e of [...evaluaciones].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const l = porAlumno.get(e.alumnoId) ?? [];
    l.push(e);
    porAlumno.set(e.alumnoId, l);
  }
  const media = (e: EvaluacionSimple) => (e.items.length ? e.items.reduce((s, i) => s + i.valor, 0) / e.items.length : null);

  let mejoraron = 0, iguales = 0, bajaron = 0, comparados = 0;
  const deltas: number[] = [];
  const criterios = new Map<string, { nombre: string; ant: number[]; act: number[] }>();

  for (const lista of porAlumno.values()) {
    if (lista.length < 2) continue;
    const ultima = lista[lista.length - 1];
    const anterior = lista[lista.length - 2];
    const mu = media(ultima);
    const ma = media(anterior);
    if (mu === null || ma === null) continue;
    comparados++;
    const d = mu - ma;
    deltas.push(d);
    if (d > margen) mejoraron++;
    else if (d < -margen) bajaron++;
    else iguales++;

    const valoresAnt = new Map(anterior.items.map((i) => [i.criterioId, i.valor]));
    for (const it of ultima.items) {
      const prev = valoresAnt.get(it.criterioId);
      if (prev === undefined) continue;
      const f = criterios.get(it.criterioId) ?? { nombre: it.nombre, ant: [], act: [] };
      f.ant.push(prev);
      f.act.push(it.valor);
      criterios.set(it.criterioId, f);
    }
  }

  const prom = (n: number[]) => n.reduce((s, x) => s + x, 0) / n.length;
  return {
    comparados,
    mejoraron,
    iguales,
    bajaron,
    deltaMedio: deltas.length ? prom(deltas) : null,
    porCriterio: [...criterios.values()]
      .map((f) => ({ nombre: f.nombre, anterior: prom(f.ant), actual: prom(f.act), delta: prom(f.act) - prom(f.ant) }))
      .sort((a, b) => b.delta - a.delta),
  };
}

export type NotaFaseSimple = { faseId: string; nombre: string; orden: number; valor: number };

export type ResumenFase = {
  faseId: string;
  nombre: string;
  orden: number;
  malas: number;
  regulares: number;
  bien: number;
  total: number;
  /** % de calificaciones "bien" (0-100) */
  pctBien: number;
  /** promedio 1 (mala) a 3 (bien) */
  promedio: number;
};

/** Cuántas calificaciones mala / regular / bien tuvo cada fase de la regata. Las más flojas primero. */
export function resumenFases(notas: NotaFaseSimple[]): ResumenFase[] {
  const porFase = new Map<string, ResumenFase>();
  for (const n of notas) {
    const f = porFase.get(n.faseId) ?? { faseId: n.faseId, nombre: n.nombre, orden: n.orden, malas: 0, regulares: 0, bien: 0, total: 0, pctBien: 0, promedio: 0 };
    if (n.valor === 1) f.malas++;
    else if (n.valor === 2) f.regulares++;
    else if (n.valor === 3) f.bien++;
    else continue;
    f.total++;
    porFase.set(n.faseId, f);
  }
  return [...porFase.values()]
    .map((f) => ({
      ...f,
      pctBien: Math.round((f.bien / f.total) * 100),
      promedio: (f.malas * 1 + f.regulares * 2 + f.bien * 3) / f.total,
    }))
    .sort((a, b) => a.promedio - b.promedio || a.orden - b.orden);
}
