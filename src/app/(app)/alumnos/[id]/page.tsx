import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Check, X, MessageSquareText } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { deFechaDB, fechaCorta, nombrePeriodo, periodoActual, periodoCorto } from "@/lib/fechas";
import { formatoNota, porcentaje, promedio, rachaAusencias } from "@/lib/calculos";
import { GraficoLinea } from "@/components/grafico-linea";
import { cambiarEstadoAlumno } from "../actions";
import { FormularioEdicion } from "./formulario-edicion";

export const metadata = { title: "Alumno" };

export default async function FichaAlumno({ params }: { params: Promise<{ id: string }> }) {
  await requerirInstructor();
  const { id } = await params;
  const alumno = await db.alumno.findUnique({ where: { id }, include: { categoria: true } });
  if (!alumno) notFound();

  const [categorias, asistencias, evaluaciones] = await Promise.all([
    db.categoria.findMany({ where: { OR: [{ activa: true }, { id: alumno.categoriaId }] }, orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    db.asistencia.findMany({
      where: { alumnoId: id, entrenamiento: { realizado: true } },
      include: { entrenamiento: { select: { fecha: true } } },
      orderBy: { entrenamiento: { fecha: "desc" } },
    }),
    db.evaluacion.findMany({ where: { alumnoId: id }, include: { items: true }, orderBy: { periodo: "asc" } }),
  ]);

  const presentes = asistencias.filter((a) => a.presente).length;
  const pct = porcentaje(presentes, asistencias.length);
  const racha = rachaAusencias(asistencias.map((a) => a.presente));
  const notas = evaluaciones
    .map((e) => ({ periodo: e.periodo, promedio: promedio(e.items.map((i) => i.valor)) }))
    .filter((n): n is { periodo: string; promedio: number } => n.promedio !== null);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/alumnos" className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft size={16} aria-hidden /> Alumnos
        </Link>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{alumno.nombre}</h1>
        <p className="text-suave">
          {alumno.categoria.nombre}
          {!alumno.activo && " · archivado"}
        </p>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <div className="caja p-3">
          <p className="text-xs text-suave">Asistencia</p>
          <p className="text-xl font-semibold">{pct === null ? "—" : `${pct}%`}</p>
          <p className="text-xs text-suave">{presentes} de {asistencias.length}</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">Faltas seguidas</p>
          <p className={`text-xl font-semibold ${racha >= 3 ? "text-peligro" : ""}`}>{racha}</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">Última nota</p>
          <p className="text-xl font-semibold">{formatoNota(notas.at(-1)?.promedio ?? null)}</p>
          <p className="text-xs text-suave">{notas.length ? nombrePeriodo(notas.at(-1)!.periodo) : "sin evaluar"}</p>
        </div>
      </section>

      <section className="caja space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Evaluaciones</h2>
          <Link href={`/evaluar/${alumno.id}?periodo=${periodoActual()}`} className="boton boton-primario !min-h-9 text-sm">
            Evaluar este mes
          </Link>
        </div>
        {notas.length > 0 ? (
          <GraficoLinea
            titulo={`Evolución del promedio de ${alumno.nombre}`}
            puntos={notas.map((n) => ({ etiqueta: periodoCorto(n.periodo), valor: n.promedio }))}
          />
        ) : (
          <p className="text-sm text-suave">Todavía no tiene evaluaciones.</p>
        )}
        {evaluaciones.length > 0 && (
          <ul className="divide-y divide-borde">
            {[...evaluaciones].reverse().map((e) => (
              <li key={e.id}>
                <Link href={`/evaluar/${alumno.id}?periodo=${e.periodo}`} className="flex min-h-11 items-center justify-between py-2 hover:text-acento">
                  <span className="first-letter:uppercase">{nombrePeriodo(e.periodo)}</span>
                  <span className="font-semibold">{formatoNota(promedio(e.items.map((i) => i.valor)))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="caja p-4">
        <h2 className="mb-2 font-semibold">Últimos entrenamientos</h2>
        {asistencias.length === 0 ? (
          <p className="text-sm text-suave">Todavía no hay entrenamientos realizados con asistencia.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {asistencias.slice(0, 20).map((a) => {
              const f = deFechaDB(a.entrenamiento.fecha);
              return (
                <li
                  key={a.entrenamientoId}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ${a.presente ? "bg-ok-suave text-ok" : "bg-alerta-suave text-alerta"}`}
                  title={a.nota ?? undefined}
                >
                  {a.presente ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
                  <span className="sr-only">{a.presente ? "Presente" : "Ausente"} el</span>
                  {fechaCorta(f)}
                  {a.nota && <MessageSquareText size={12} aria-label="Con observación" />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {asistencias.some((a) => a.nota) && (
        <section className="caja p-4">
          <h2 className="mb-2 font-semibold">Observaciones</h2>
          <ul className="divide-y divide-borde">
            {asistencias
              .filter((a) => a.nota)
              .slice(0, 20)
              .map((a) => (
                <li key={a.entrenamientoId} className="py-2.5">
                  <p className="text-xs text-suave">{fechaCorta(deFechaDB(a.entrenamiento.fecha))}</p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{a.nota}</p>
                </li>
              ))}
          </ul>
        </section>
      )}

      <FormularioEdicion
        alumno={{ id: alumno.id, nombre: alumno.nombre, categoriaId: alumno.categoriaId, notas: alumno.notas }}
        categorias={categorias}
      />

      <form action={cambiarEstadoAlumno.bind(null, alumno.id, !alumno.activo)}>
        <button type="submit" className={`boton ${alumno.activo ? "boton-peligro" : ""}`}>
          {alumno.activo ? "Archivar alumno" : "Reactivar alumno"}
        </button>
        {alumno.activo && (
          <p className="mt-1 text-sm text-suave">Deja de aparecer en las listas, pero se conserva todo su historial.</p>
        )}
      </form>
    </div>
  );
}
