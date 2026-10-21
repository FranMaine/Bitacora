// Carga las listas iniciales (categorías, temas y criterios de evaluación) si no existen.
// Se puede correr las veces que haga falta: no pisa nada. Después se editan desde Ajustes.
//   pnpm db:seed
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const CATEGORIAS = ["Optimist Principiantes", "Optimist Timoneles", "ILCA 4", "ILCA 6", "420"];
const TEMAS = [
  "Popa", "Ceñida", "Largadas", "Viradas", "Trasluchadas", "Balizas",
  "Trimado de velas", "Posición del cuerpo", "Maniobras básicas", "Reglas de regata", "Navegación libre",
];
const CRITERIOS = [
  "Técnica de maniobras", "Trimado de velas", "Táctica", "Reglas", "Actitud y compromiso", "Autonomía",
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
  console.log(`Listo: ${CATEGORIAS.length} categorías, ${TEMAS.length} temas, ${CRITERIOS.length} criterios.`);
}

main().finally(() => db.$disconnect());
