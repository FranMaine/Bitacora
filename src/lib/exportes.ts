import { db } from "@/lib/db";
import { deFechaDB, hoyAR } from "@/lib/fechas";
import { minutosEntre, promedio } from "@/lib/calculos";
import { libroAsistencia, libroEvaluaciones, libroMantenimiento } from "@/lib/excel";
import { diasPendiente, diasQueTardo } from "@/lib/mantenimiento";

// Arma los libros de Excel a partir de la base. Lo usan la descarga de la web (/api/exportar) y las pruebas.

export async function libroDeAsistencia(categoriaId?: string) {
  const [filas, alumnos] = await Promise.all([
    db.asistencia.findMany({
      where: { entrenamiento: { realizado: true, ...(categoriaId ? { categoriaId } : {}) } },
      select: {
        presente: true,
        nota: true,
        alumno: { select: { nombre: true } },
        entrenamiento: { select: { fecha: true, tipo: true, horaBajada: true, horaRegreso: true, categoria: { select: { nombre: true } } } },
      },
    }),
    db.alumno.findMany({
      where: { activo: true, ...(categoriaId ? { categoriaId } : {}), categoria: { activa: true } },
      orderBy: [{ categoria: { orden: "asc" } }, { nombre: "asc" }],
      select: { nombre: true, categoria: { select: { nombre: true } } },
    }),
  ]);
  return libroAsistencia(
    filas.map((f) => ({
      fecha: deFechaDB(f.entrenamiento.fecha),
      categoria: f.entrenamiento.categoria.nombre,
      tipo: f.entrenamiento.tipo === "REGATA" ? ("Regata" as const) : ("Entrenamiento" as const),
      alumno: f.alumno.nombre,
      presente: f.presente,
      minutos: minutosEntre(f.entrenamiento.horaBajada, f.entrenamiento.horaRegreso),
      nota: f.nota,
    })),
    alumnos.map((a) => ({ categoria: a.categoria.nombre, alumno: a.nombre })),
  );
}

export async function libroDeEvaluaciones(categoriaId?: string) {
  const [criterios, evaluaciones] = await Promise.all([
    db.criterio.findMany({ orderBy: { orden: "asc" }, select: { nombre: true } }),
    db.evaluacion.findMany({
      where: categoriaId ? { alumno: { categoriaId } } : {},
      orderBy: [{ fecha: "asc" }, { alumno: { nombre: "asc" } }],
      select: {
        fecha: true,
        comentario: true,
        alumno: { select: { nombre: true, categoria: { select: { nombre: true } } } },
        instructor: { select: { nombre: true } },
        items: { select: { valor: true, criterio: { select: { nombre: true } } } },
      },
    }),
  ]);
  return libroEvaluaciones(
    evaluaciones.map((e) => ({
      fecha: deFechaDB(e.fecha),
      categoria: e.alumno.categoria.nombre,
      alumno: e.alumno.nombre,
      instructor: e.instructor.nombre,
      promedio: promedio(e.items.map((i) => i.valor)),
      valores: Object.fromEntries(e.items.map((i) => [i.criterio.nombre, i.valor])),
      comentario: e.comentario,
    })),
    criterios.map((c) => c.nombre),
  );
}

export async function libroDeMantenimiento(embarcacionId: string) {
  const [embarcacion, items] = await Promise.all([
    db.embarcacion.findUnique({ where: { id: embarcacionId }, select: { nombre: true } }),
    db.mantenimiento.findMany({
      where: { embarcacionId },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      include: { creadoPor: { select: { nombre: true } }, resueltoPor: { select: { nombre: true } } },
    }),
  ]);
  if (!embarcacion) return null;
  const hoy = hoyAR();
  return {
    nombre: embarcacion.nombre,
    libro: libroMantenimiento(
      embarcacion.nombre,
      items.map((i) => {
        const fecha = deFechaDB(i.fecha);
        const resueltoEn = i.resueltoEn ? deFechaDB(i.resueltoEn) : null;
        const arreglado = i.estado === "ARREGLADO" && resueltoEn !== null;
        return {
          fecha,
          descripcion: i.descripcion,
          urgente: i.urgente,
          estado: arreglado ? ("Arreglado" as const) : ("Pendiente" as const),
          cargo: i.creadoPor.nombre,
          resueltoEn: arreglado ? resueltoEn : null,
          dias: arreglado ? diasQueTardo(fecha, resueltoEn) : diasPendiente(fecha, hoy),
          solucion: i.solucion,
          arreglo: arreglado ? (i.resueltoPor?.nombre ?? null) : null,
        };
      }),
    ),
  };
}
