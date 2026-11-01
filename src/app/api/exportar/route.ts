import { db } from "@/lib/db";
import { idDeSesion } from "@/lib/session";
import { armarCsv } from "@/lib/csv";
import { deFechaDB, hoyAR } from "@/lib/fechas";
import { promedio } from "@/lib/calculos";

// Descarga en CSV (se abre con Excel): ?tipo=asistencia | evaluaciones, y opcional &categoria=<id>.
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

  let csv: string;
  if (tipo === "asistencia") {
    const filas = await db.asistencia.findMany({
      where: { entrenamiento: { realizado: true, ...(categoriaId ? { categoriaId } : {}) } },
      orderBy: [{ entrenamiento: { fecha: "asc" } }, { alumno: { nombre: "asc" } }],
      select: {
        presente: true,
        nota: true,
        alumno: { select: { nombre: true } },
        entrenamiento: { select: { fecha: true, tipo: true, horaBajada: true, horaRegreso: true, categoria: { select: { nombre: true } } } },
      },
    });
    csv = armarCsv(
      ["Fecha", "Categoría", "Tipo de jornada", "Alumno", "Asistencia", "Bajada", "Regreso", "Observación"],
      filas.map((f) => [
        deFechaDB(f.entrenamiento.fecha),
        f.entrenamiento.categoria.nombre,
        f.entrenamiento.tipo === "REGATA" ? "Regata" : "Entrenamiento",
        f.alumno.nombre,
        f.presente ? "Presente" : "Ausente",
        f.entrenamiento.horaBajada,
        f.entrenamiento.horaRegreso,
        f.nota,
      ]),
    );
  } else if (tipo === "evaluaciones") {
    const [criterios, evaluaciones] = await Promise.all([
      db.criterio.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
      db.evaluacion.findMany({
        where: categoriaId ? { alumno: { categoriaId } } : {},
        orderBy: [{ fecha: "asc" }, { alumno: { nombre: "asc" } }],
        select: {
          fecha: true,
          comentario: true,
          alumno: { select: { nombre: true, categoria: { select: { nombre: true } } } },
          instructor: { select: { nombre: true } },
          items: { select: { criterioId: true, valor: true } },
        },
      }),
    ]);
    csv = armarCsv(
      ["Fecha", "Categoría", "Alumno", "Evaluó", "Promedio", ...criterios.map((c) => c.nombre), "Comentario"],
      evaluaciones.map((e) => {
        const valores = new Map(e.items.map((i) => [i.criterioId, i.valor]));
        const prom = promedio(e.items.map((i) => i.valor));
        return [
          deFechaDB(e.fecha),
          e.alumno.categoria.nombre,
          e.alumno.nombre,
          e.instructor.nombre,
          prom === null ? "" : prom.toFixed(1).replace(".", ","),
          ...criterios.map((c) => valores.get(c.id) ?? ""),
          e.comentario,
        ];
      }),
    );
  } else {
    return new Response("Tipo inválido: usá asistencia o evaluaciones", { status: 400 });
  }

  const sufijo = categoria ? `-${categoria.nombre.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-")}` : "";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bitacora-${tipo}${sufijo}-${hoyAR()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
