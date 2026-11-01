// Prueba de punta a punta de /api/exportar contra un servidor local (pnpm start): firma una sesión de prueba
// con el SESSION_SECRET de .env.local y baja los dos archivos. Usa la base que apunte DATABASE_URL.
//   pnpm exec tsx scripts/probar-descarga.ts <carpeta de salida> [puerto]
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";

async function main() {
  const [salida = ".", puerto = "3100"] = process.argv.slice(2);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const instructor = await db.instructor.findFirst({ where: { activo: true }, select: { id: true } });
  await db.$disconnect();
  if (!instructor) throw new Error("No hay instructores activos en la base");
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(instructor.id).setExpirationTime("5m").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  fs.mkdirSync(salida, { recursive: true });
  for (const tipo of ["asistencia", "evaluaciones"]) {
    const r = await fetch(`http://localhost:${puerto}/api/exportar?tipo=${tipo}`, { headers: { cookie: `bitacora_sesion=${token}` } });
    const buf = Buffer.from(await r.arrayBuffer());
    console.log(tipo, r.status, r.headers.get("content-type"), r.headers.get("content-disposition"), buf.length, "bytes");
    if (r.ok) fs.writeFileSync(path.join(salida, `descarga-${tipo}.xlsx`), buf);
  }
  const sin = await fetch(`http://localhost:${puerto}/api/exportar?tipo=asistencia`, { redirect: "manual" });
  console.log("sin sesión:", sin.status);
}

main();
