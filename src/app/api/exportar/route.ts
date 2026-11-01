import { db } from "@/lib/db";
import { idDeSesion } from "@/lib/session";
import { hoyAR } from "@/lib/fechas";
import { libroDeAsistencia, libroDeEvaluaciones } from "@/lib/exportes";

// Descarga un archivo de Excel (.xlsx) con formato: ?tipo=asistencia | evaluaciones, y opcional &categoria=<id>.
export async function GET(request: Request) {
  // Misma verificación que las páginas: sesión válida y instructor activo.
  const id = await idDeSesion();
  const instructor = id ? await db.instructor.findUnique({ where: { id }, select: { activo: true } }) : null;
  if (!instructor?.activo) return new Response("No autorizado", { status: 401 });

  const params = new URL(request.url).searchParams;
  const tipo = params.get("tipo");
  const categoriaId = params.get("categoria") || undefined;
  const categoria = categoriaId ? await db.categoria.findUnique({ where: { id: categoriaId }, select: { nombre: true } }) : null;
  if (categoriaId && !categoria) return new Response("Categoría inexistente", { status: 404 });
  if (tipo !== "asistencia" && tipo !== "evaluaciones") return new Response("Tipo inválido: usá asistencia o evaluaciones", { status: 400 });

  const libro = tipo === "asistencia" ? await libroDeAsistencia(categoriaId) : await libroDeEvaluaciones(categoriaId);
  const sufijo = categoria ? `-${categoria.nombre.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-")}` : "";
  const contenido = await libro.xlsx.writeBuffer();
  return new Response(contenido as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bitacora-${tipo}${sufijo}-${hoyAR()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
