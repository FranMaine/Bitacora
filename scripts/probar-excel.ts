// Genera los dos archivos de Excel con los datos reales de la base y los guarda en una carpeta para revisarlos.
//   pnpm exec tsx scripts/probar-excel.ts <carpeta de salida>
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const salida = process.argv[2] ?? ".";
  fs.mkdirSync(salida, { recursive: true });
  const { libroDeAsistencia, libroDeEvaluaciones } = await import("../src/lib/exportes");
  const { db } = await import("../src/lib/db");
  const archivos: [string, Awaited<ReturnType<typeof libroDeAsistencia>>][] = [
    ["asistencia.xlsx", await libroDeAsistencia()],
    ["evaluaciones.xlsx", await libroDeEvaluaciones()],
  ];
  for (const [nombre, libro] of archivos) {
    const ruta = path.join(salida, nombre);
    await libro.xlsx.writeFile(ruta);
    console.log(ruta, fs.statSync(ruta).size, "bytes · hojas:", libro.worksheets.map((h) => h.name).join(", "));
  }
  await db.$disconnect();
}

main();
