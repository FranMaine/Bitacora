// Carga las listas iniciales (categorías, temas y criterios de evaluación) si no existen.
// Se puede correr las veces que haga falta: no pisa nada. Después se editan desde Ajustes.
//   pnpm db:seed
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const CATEGORIAS = ["Optimist Escuela", "Optimist Principiantes", "Optimist Timoneles", "420"];
const TEMAS = [
  "Popa", "Ceñida", "Largadas", "Viradas", "Trasluchadas", "Balizas",
  "Trimado de velas", "Posición del cuerpo", "Maniobras básicas", "Reglas de regata", "Navegación libre",
];
const FASES = [
  "Largada", "Primera ceñida", "Aproximación al barlovento", "Través (reach)", "Popa", "Gate", "Segunda ceñida",
];
const CRITERIOS = [
  "Armado y puesta a punto",
  "Nomenclatura / teoría",
  "Maniobras (trasluchadas - roll tack - viradas de boyas - 720)",
  "Llevada en franco c/ viento",
  "Llevada en franco c/ calma",
  "Llevada en ceñida c/ viento",
  "Llevada en ceñida c/ calma",
  "Estrategias / tácticas",
  "Conocimiento del reglamento - banderas de regata - tipos de recorrido",
  "Postura en el barco",
  "Desenvolvimiento en situaciones difíciles (problemáticas)",
  "Largadas (estrategia, técnicas y tácticas)",
  "Técnicas con olas - francos",
  "Técnicas con olas - ceñida",
  "Comportamiento con compañeros e instructores",
  "Cuidado del barco",
  "Predisposición a superarse",
  "Trabajo en equipo",
];

async function main() {
  for (const [i, nombre] of CATEGORIAS.entries()) {
    await db.categoria.upsert({ where: { nombre }, update: {}, create: { nombre, orden: i } });
  }
  for (const [i, nombre] of TEMAS.entries()) {
    await db.tema.upsert({ where: { nombre }, update: {}, create: { nombre, orden: i } });
  }
  for (const [i, nombre] of CRITERIOS.entries()) {
    await db.criterio.upsert({ where: { nombre }, update: {}, create: { nombre, orden: i } });
  }
  for (const [i, nombre] of FASES.entries()) {
    await db.faseRegata.upsert({ where: { nombre }, update: {}, create: { nombre, orden: i } });
  }
  for (const n of [2, 3, 4, 5, 6, 7, 8]) {
    await db.embarcacion.upsert({ where: { nombre: `Bote ${n}` }, update: {}, create: { nombre: `Bote ${n}`, orden: n } });
  }
  console.log(`Listo: ${CATEGORIAS.length} categorías, ${TEMAS.length} temas, ${CRITERIOS.length} criterios, ${FASES.length} fases de regata.`);
}

main().finally(() => db.$disconnect());
