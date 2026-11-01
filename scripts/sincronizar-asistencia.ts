// Trae la asistencia de la planilla de Google Sheets del club y la suma a la base, SIN borrar nada:
//   - una salida (fecha + categoría) que no existe se crea como "realizada" (la planilla no trae horarios);
//   - una salida que ya existe conserva sus horarios, temas, viento y observaciones;
//   - cada presente/ausente de la planilla se crea o se corrige; lo que no figura en la planilla no se toca.
// Se puede correr todas las veces que haga falta: si no hay novedades, no cambia nada.
//   pnpm sync:asistencia             -> simulacro: muestra qué cambiaría
//   pnpm sync:asistencia --aplicar   -> escribe los cambios
// Variables opcionales: PLANILLA_ID (id de la planilla), PLANILLA_ANIO (año de las fechas, por defecto 2026).
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APLICAR = process.argv.includes("--aplicar");
const PLANILLA_ID = process.env.PLANILLA_ID ?? "17hjNH9fDRtC3xYJxHBYNYQ8BuZANCcFe";
const ANIO = Number(process.env.PLANILLA_ANIO ?? 2026);
const EMAIL_AUTOR = process.env.AUTOR_EMAIL ?? "franmaine1@gmail.com";

// hoja de la planilla -> nombre de la categoría en Bitácora
const HOJAS: Record<string, string> = {
  "Opt. Escuela": "Optimist Escuela",
  "Opt. Principiantes": "Optimist Principiantes",
  "Opt. Timoneles": "Optimist Timoneles",
  "420": "420",
};
const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const norm = (t: unknown) =>
  String(t ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

type Registro = { nombre: string; presente: boolean };
type Salida = { fecha: string; registros: Registro[] };

/** Lee una hoja: fila 1 = meses, fila 2 = días; una fila por alumno hasta la primera sin nombre o de "Total". */
function leerHoja(filas: unknown[][], hoy: string): { alumnos: string[]; salidas: Salida[] } {
  const meses = filas[0] ?? [];
  const dias = filas[1] ?? [];
  const colNombre = dias.findIndex((c) => String(c ?? "").toUpperCase().includes("NOMBRE"));
  if (colNombre < 0) throw new Error("No encontré la columna NOMBRE Y APELLIDO");

  let mesActual: number | null = null;
  const columnas: { col: number; fecha: string }[] = [];
  dias.forEach((d, i) => {
    const m = norm(meses[i]);
    if (m in MESES) mesActual = MESES[m];
    if (i <= colNombre || mesActual === null) return;
    if (typeof d === "number" && d >= 1 && d <= 31) {
      const fecha = new Date(Date.UTC(ANIO, mesActual - 1, d));
      if (fecha.getUTCMonth() !== mesActual - 1) return; // día inexistente (ej. 31 de abril)
      columnas.push({ col: i, fecha: fecha.toISOString().slice(0, 10) });
    }
  });

  const alumnos: { nombre: string; fila: unknown[] }[] = [];
  for (const fila of filas.slice(2)) {
    const nombre = fila[colNombre];
    if (!nombre || norm(nombre).startsWith("total") || norm(nombre).startsWith("chicos")) break;
    alumnos.push({ nombre: String(nombre).trim(), fila });
  }

  const salidas: Salida[] = [];
  for (const { col, fecha } of columnas) {
    if (fecha > hoy) continue;
    const registros: Registro[] = [];
    for (const { nombre, fila } of alumnos) {
      const v = norm(fila[col]);
      if (v === "p") registros.push({ nombre, presente: true });
      else if (v === "a") registros.push({ nombre, presente: false });
    }
    // Sin ningún presente no hubo salida (feriado, suspendida, aún sin cargar...).
    if (registros.some((r) => r.presente)) salidas.push({ fecha, registros });
  }
  return { alumnos: alumnos.map((a) => a.nombre), salidas };
}

async function main() {
  const url = `https://docs.google.com/spreadsheets/d/${PLANILLA_ID}/export?format=xlsx`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`No pude bajar la planilla (${resp.status}). ¿Sigue compartida con "cualquiera con el enlace"?`);
  const libro = XLSX.read(Buffer.from(await resp.arrayBuffer()), { type: "buffer" });

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const autor = await db.instructor.findUnique({ where: { email: EMAIL_AUTOR }, select: { id: true } });
  if (!autor) throw new Error(`No existe el instructor ${EMAIL_AUTOR}`);
  const categorias = await db.categoria.findMany({ where: { activa: true } });
  const alumnosBD = await db.alumno.findMany({ where: { activo: true }, select: { id: true, nombre: true, categoriaId: true } });

  let salidasNuevas = 0, asistNuevas = 0, asistCambiadas = 0, sinCambios = 0;
  const avisos: string[] = [];
  const crearSalidas: { id: string; fecha: Date; categoriaId: string; realizado: boolean; creadoPorId: string }[] = [];
  const crearAsist: { entrenamientoId: string; alumnoId: string; presente: boolean }[] = [];
  const cambiarAsist: { entrenamientoId: string; alumnoId: string; presente: boolean }[] = [];

  for (const [hoja, nombreCat] of Object.entries(HOJAS)) {
    const ws = libro.Sheets[hoja];
    const cat = categorias.find((c) => c.nombre === nombreCat);
    if (!ws || !cat) {
      avisos.push(`Falta la hoja "${hoja}" o la categoría "${nombreCat}"`);
      continue;
    }
    const { alumnos, salidas } = leerHoja(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true }), hoy);

    // El nombre de la planilla debe ser parte (todas sus palabras) del nombre de UN alumno de la categoría.
    const candidatos = alumnosBD.filter((a) => a.categoriaId === cat.id);
    const mapa = new Map<string, string>();
    for (const n of alumnos) {
      const palabras = norm(n).split(" ");
      const ok = candidatos.filter((a) => {
        const p = norm(a.nombre).split(" ");
        return palabras.every((w) => p.includes(w));
      });
      if (ok.length === 1) mapa.set(n, ok[0].id);
      else avisos.push(`${nombreCat}: "${n}" ${ok.length ? "es ambiguo" : "no está cargado como alumno de la categoría"} (se omite)`);
    }

    const existentes = await db.entrenamiento.findMany({
      where: { categoriaId: cat.id },
      select: { id: true, fecha: true, asistencias: { select: { alumnoId: true, presente: true } } },
    });
    const porFecha = new Map(existentes.map((e) => [e.fecha.toISOString().slice(0, 10), e]));

    for (const s of salidas) {
      const ent = porFecha.get(s.fecha);
      let entId: string;
      if (!ent) {
        entId = crypto.randomUUID();
        crearSalidas.push({ id: entId, fecha: new Date(`${s.fecha}T00:00:00.000Z`), categoriaId: cat.id, realizado: true, creadoPorId: autor.id });
        salidasNuevas++;
      } else {
        entId = ent.id;
      }
      const actuales = new Map(ent?.asistencias.map((a) => [a.alumnoId, a.presente]));
      for (const r of s.registros) {
        const alumnoId = mapa.get(r.nombre);
        if (!alumnoId) continue;
        const previo = actuales.get(alumnoId);
        if (previo === undefined) {
          crearAsist.push({ entrenamientoId: entId, alumnoId, presente: r.presente });
          asistNuevas++;
        } else if (previo !== r.presente) {
          cambiarAsist.push({ entrenamientoId: entId, alumnoId, presente: r.presente });
          asistCambiadas++;
        } else sinCambios++;
      }
    }
  }

  console.log(`Salidas nuevas: ${salidasNuevas} | asistencias nuevas: ${asistNuevas} | corregidas: ${asistCambiadas} | iguales: ${sinCambios}`);
  if (avisos.length) console.log("Avisos:\n- " + avisos.join("\n- "));
  if (!APLICAR) {
    console.log(salidasNuevas + asistNuevas + asistCambiadas ? "Simulacro: agregá --aplicar para escribir estos cambios." : "Todo está al día.");
    return;
  }
  if (salidasNuevas + asistNuevas + asistCambiadas === 0) {
    console.log("Todo está al día: no hay nada para escribir.");
    return;
  }
  await db.$transaction(
    async (tx) => {
      if (crearSalidas.length) await tx.entrenamiento.createMany({ data: crearSalidas });
      for (let i = 0; i < crearAsist.length; i += 1000) await tx.asistencia.createMany({ data: crearAsist.slice(i, i + 1000) });
      for (const c of cambiarAsist) {
        await tx.asistencia.update({ where: { entrenamientoId_alumnoId: { entrenamientoId: c.entrenamientoId, alumnoId: c.alumnoId } }, data: { presente: c.presente } });
      }
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  console.log("Listo: asistencia sincronizada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
