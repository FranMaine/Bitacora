import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 declara la conexión acá (la usan `prisma db push`, `generate`, etc.);
// en runtime la conexión va por el driver adapter de src/lib/db.ts.
// Se lee .env.local primero (desarrollo) y después .env.
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL },
});
