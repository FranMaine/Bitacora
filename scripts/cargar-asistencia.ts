// Borra TODAS las jornadas (con sus asistencias, temas, calificaciones de regata) y las evaluaciones,
// y carga la asistencia que viene en un JSON generado a partir de la planilla del club.
//   pnpm exec tsx scripts/cargar-asistencia.ts <asistencia.json>             -> simulacro (no escribe nada)
//   pnpm exec tsx scripts/cargar-asistencia.ts <asistencia.json> --aplicar   -> borra y carga
// Cada salida de la planilla se carga como entrenamiento "realizado", sin horarios (la planilla no los trae).
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const [archivo, ...flags] = process.argv.slice(2);
const APLICAR = flags.includes("--aplicar");
const EMAIL_AUTOR = "franmaine1@gmail.com";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type Sesion = { fecha: string; registros: { nombre: string; presente: boolean }[] };
type Datos = Record<string, { alumnos: string[]; sesiones: Sesion[] }>;

const norm = (t: string) =>
  t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

async function main() {
  const datos: Datos = JSON.parse(fs.readFileSync(archivo, "utf8"));
  const autor = await db.instructor.findUnique({ where: { email: EMAIL_AUTOR }, select: { id: true } });
  if (!autor) throw new Error(`No existe el instructor ${EMAIL_AUTOR}`);

  const categorias = await db.categoria.findMany({ where: { activa: true } });
  const alumnosBD = await db.alumno.findMany({ where: { activo: true }, select: { id: true, nombre: true, categoriaId: true } });

  const entrenamientos: { id: string; fecha: Date; categoriaId: string; realizado: boolean; creadoPorId: string }[] = [];
  const asistencias: { entrenamientoId: string; alumnoId: string; presente: boolean }[] = [];
  const problemas: string[] = [];

  for (const [nombreCat, { alumnos, sesiones }] of Object.entries(datos)) {
    const cat = categorias.find((c) => c.nombre === nombreCat);
    if (!cat) {
      problemas.push(`Categoría inexistente: ${nombreCat}`);
      continue;
    }
    const candidatos = alumnosBD.filter((a) => a.categoriaId === cat.id);
    // Cada nombre de la planilla debe ser parte (todas sus palabras) del nombre de UN alumno de la categoría.
    const mapa = new Map<string, string>();
    for (const n of alumnos) {
      const palabras = norm(n).split(" ");
      const coinciden = candidatos.filter((a) => {
        const p = norm(a.nombre).split(" ");
        return palabras.every((w) => p.includes(w));
      });
      if (coinciden.length === 1) mapa.set(n, coinciden[0].id);
      else problemas.push(`${nombreCat}: "${n}" -> ${coinciden.length ? "ambiguo (" + coinciden.map((c) => c.nombre).join(", ") + ")" : "no encontrado"}`);
    }
    console.log(`${nombreCat}: ${[...mapa.keys()].map((n) => `${n.trim()} => ${candidatos.find((a) => a.id === mapa.get(n))!.nombre}`).join(" | ")}`);

    for (const s of sesiones) {
      const id = randomUUID();
      entrenamientos.push({ id, fecha: new Date(`${s.fecha}T00:00:00.000Z`), categoriaId: cat.id, realizado: true, creadoPorId: autor.id });
      for (const r of s.registros) {
        const alumnoId = mapa.get(r.nombre);
        if (alumnoId) asistencias.push({ entrenamientoId: id, alumnoId, presente: r.presente });
      }
    }
  }

  const [nEnt, nAsis, nEval, nFase] = await Promise.all([
    db.entrenamiento.count(),
    db.asistencia.count(),
    db.evaluacion.count(),
    db.notaFase.count(),
  ]);
  console.log(`\nSe BORRARÍA: ${nEnt} jornadas, ${nAsis} asistencias, ${nFase} calificaciones de regata, ${nEval} evaluaciones.`);
  console.log(`Se CARGARÍA: ${entrenamientos.length} jornadas y ${asistencias.length} asistencias (${asistencias.filter((a) => a.presente).length} presentes).`);
  if (problemas.length) {
    console.log("\nPROBLEMAS (no se aplica nada hasta resolverlos):\n- " + problemas.join("\n- "));
    process.exit(1);
  }
  if (!APLICAR) {
    console.log("\nSimulacro: no se escribió nada. Agregá --aplicar para borrar y cargar.");
    return;
  }

  await db.$transaction(
    async (tx) => {
      await tx.evaluacion.deleteMany({}); // sus ítems se borran en cascada
      await tx.entrenamiento.deleteMany({}); // asistencias, temas y calificaciones de regata, en cascada
      await tx.entrenamiento.createMany({ data: entrenamientos });
      for (let i = 0; i < asistencias.length; i += 1000) {
        await tx.asistencia.createMany({ data: asistencias.slice(i, i + 1000) });
      }
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  console.log("\nListo: base limpiada y asistencia cargada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
