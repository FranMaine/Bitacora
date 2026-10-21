// Crea (o actualiza la contraseña de) un instructor. La contraseña NO va por argumento
// para que no quede en el historial de la terminal: se pasa por variable de entorno.
//   INSTRUCTOR_PASSWORD="..." pnpm db:crear-instructor "Nombre Apellido" email@dominio.com
// Si no se define INSTRUCTOR_PASSWORD, se genera una al azar y se muestra una sola vez.
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const [nombre, emailCrudo] = process.argv.slice(2);
  if (!nombre || !emailCrudo) {
    console.error('Uso: INSTRUCTOR_PASSWORD="..." pnpm db:crear-instructor "Nombre Apellido" email@dominio.com');
    process.exit(1);
  }
  const email = emailCrudo.trim().toLowerCase();
  const generada = !process.env.INSTRUCTOR_PASSWORD;
  const password = process.env.INSTRUCTOR_PASSWORD ?? randomBytes(9).toString("base64url");
  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const instructor = await db.instructor.upsert({
    where: { email },
    update: { nombre: nombre.trim(), passwordHash, activo: true },
    create: { nombre: nombre.trim(), email, passwordHash },
  });
  console.log(`Instructor listo: ${instructor.nombre} <${instructor.email}>`);
  if (generada) console.log(`Contraseña generada (anotala, no se vuelve a mostrar): ${password}`);
}

main().finally(() => db.$disconnect());
