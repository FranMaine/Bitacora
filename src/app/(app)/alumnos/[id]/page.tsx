import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, X, MessageSquareText, Plus } from "lucide-react";
import { LogoClase } from "@/components/logo-clase";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { deFechaDB, fechaCorta } from "@/lib/fechas";
import { formatoDuracion, formatoNota, formatoTendencia, minutosEntre, porcentaje, promedio, rachaAusencias, tendencia } from "@/lib/calculos";
import { GraficoLinea } from "@/components/grafico-linea";
import { cambiarEstadoAlumno } from "../actions";
import { FormularioEdicion } from "./formulario-edicion";

export const metadata = { title: "Alumno" };

function Delta({ valor }: { valor: number | null }) {
  const t = formatoTendencia(valor);
  if (!t || t === "=") return null;
  return <span className={`text-xs font-medium ${t.startsWith("+") ? "text-ok" : "text-peligro"}`}>{t}</span>;
}

export default async function FichaAlumno({ params }: { params: Promise<{ id: string }> }) {
  await requerirInstructor();
  const { id } = await params;
  const alumno = await db.alumno.findUnique({ where: { id }, include: { categoria: true } });
  if (!alumno) notFound();

  const [categorias, asistencias, evaluaciones, notasFase] = await Promise.all([
    db.categoria.findMany({ where: { OR: [{ activa: true }, { id: alumno.categoriaId }] }, orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    db.asistencia.findMany({
      where: { alumnoId: id, entrenamiento: { realizado: true } },
      include: { entrenamiento: { select: { fecha: true, horaBajada: true, horaRegreso: true } } },
      orderBy: { entrenamiento: { fecha: "desc" } },
    }),
    db.evaluacion.findMany({
      where: { alumnoId: id },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      include: { items: { include: { criterio: { select: { id: true, nombre: true, orden: true } } } } },
    }),
    db.notaFase.findMany({
      where: { alumnoId: id },
      orderBy: { entrenamiento: { fecha: "asc" } },
      select: { valor: true, faseId: true, fase: { select: { nombre: true, orden: true } }, entrenamiento: { select: { fecha: true } } },
    }),
  ]);

  // Desempeño en regatas: por fase, todas sus calificaciones en orden cronológico.
  const porFase = new Map<string, { nombre: string; orden: number; valores: number[] }>();
  for (const n of notasFase) {
    const f = porFase.get(n.faseId) ?? { nombre: n.fase.nombre, orden: n.fase.orden, valores: [] };
    f.valores.push(n.valor);
    porFase.set(n.faseId, f);
  }
  const fasesAlumno = [...porFase.values()].sort((a, b) => a.orden - b.orden);

  const presentes = asistencias.filter((a) => a.presente).length;
  const pct = porcentaje(presentes, asistencias.length);
  const racha = rachaAusencias(asistencias.map((a) => a.presente));
  const minutosAgua = asistencias.reduce(
    (s, a) => (a.presente ? s + (minutosEntre(a.entrenamiento.horaBajada, a.entrenamiento.horaRegreso) ?? 0) : s),
    0,
  );

  // Una fila por evaluación, de la más vieja a la más nueva.
  const serie = evaluaciones.map((e) => ({
    id: e.id,
    fecha: deFechaDB(e.fecha),
    promedio: promedio(e.items.map((i) => i.valor)),
    comentario: e.comentario,
    items: [...e.items].sort((a, b) => a.criterio.orden - b.criterio.orden),
  }));
  const conNota = serie.filter((e): e is typeof e & { promedio: number } => e.promedio !== null);
  const deltaGeneral = tendencia(conNota.map((e) => e.promedio));

  // Por criterio: todas las notas en el tiempo, para ver cuánto mejoró cada uno.
  const porCriterio = new Map<string, { nombre: string; orden: number; valores: number[] }>();
  for (const e of serie) {
    for (const it of e.items) {
      const f = porCriterio.get(it.criterio.id) ?? { nombre: it.criterio.nombre, orden: it.criterio.orden, valores: [] };
      f.valores.push(it.valor);
      porCriterio.set(it.criterio.id, f);
    }
  }
  const criterios = [...porCriterio.values()].sort((a, b) => a.orden - b.orden);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/alumnos" className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft size={16} aria-hidden /> Alumnos
        </Link>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{alumno.nombre}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-suave">
          <span className="flex size-5 items-center justify-center" aria-hidden>
            <LogoClase nombre={alumno.categoria.nombre} tam={18} />
          </span>
          {alumno.categoria.nombre}
          {!alumno.activo && " · archivado"}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="caja p-3">
          <p className="text-xs text-suave">Asistencia</p>
          <p className="text-xl font-semibold">{pct === null ? "—" : `${pct}%`}</p>
          <p className="text-xs text-suave">{presentes} de {asistencias.length} salidas</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">En el agua</p>
          <p className="text-xl font-semibold">{minutosAgua ? formatoDuracion(minutosAgua) : "—"}</p>
          <p className="text-xs text-suave">sumando sus salidas</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">Faltas seguidas</p>
          <p className={`text-xl font-semibold ${racha >= 3 ? "text-peligro" : ""}`}>{racha}</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">Última nota</p>
          <p className="flex items-baseline gap-1.5 text-xl font-semibold">
            {formatoNota(conNota.at(-1)?.promedio ?? null)} <Delta valor={deltaGeneral} />
          </p>
          <p className="text-xs text-suave">{conNota.length ? fechaCorta(conNota.at(-1)!.fecha) : "sin evaluar"}</p>
        </div>
      </section>

      <section className="caja space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Evolución</h2>
          <Link href={`/evaluar/${alumno.id}`} className="boton boton-primario !min-h-9 text-sm">
            <Plus size={16} aria-hidden /> Nueva evaluación
          </Link>
        </div>
        {conNota.length === 0 ? (
          <p className="text-sm text-suave">Todavía no tiene evaluaciones. Podés hacerle una cuando quieras.</p>
        ) : (
          <>
            <GraficoLinea
              titulo={`Evolución del promedio de ${alumno.nombre}`}
              puntos={conNota.map((e) => ({ etiqueta: fechaCorta(e.fecha), valor: e.promedio }))}
            />
            {conNota.length > 1 && (
              <p className="text-sm text-suave">
                De la primera evaluación ({formatoNota(conNota[0].promedio)}) a la última ({formatoNota(conNota.at(-1)!.promedio)}):{" "}
                <strong className={conNota.at(-1)!.promedio >= conNota[0].promedio ? "text-ok" : "text-peligro"}>
                  {formatoTendencia(conNota.at(-1)!.promedio - conNota[0].promedio)}
                </strong>
              </p>
            )}
          </>
        )}

        {criterios.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-suave">Por criterio</h3>
            <ul className="divide-y divide-borde">
              {criterios.map((c) => {
                const ultimo = c.valores.at(-1)!;
                return (
                  <li key={c.nombre} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm">{c.nombre}</span>
                      <span className="flex items-baseline gap-1.5">
                        <Delta valor={tendencia(c.valores)} />
                        <span className="font-semibold">{ultimo}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-borde" aria-hidden>
                      <div className="h-full rounded-full bg-acento" style={{ width: `${ultimo * 10}%` }} />
                    </div>
                    {c.valores.length > 1 && <p className="mt-1 text-xs text-suave">Historial: {c.valores.join(" → ")}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {serie.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium text-suave">Todas las evaluaciones</h3>
            <ul className="divide-y divide-borde">
              {[...serie].reverse().map((e, idx, lista) => {
                const anterior = lista[idx + 1]?.promedio ?? null;
                return (
                  <li key={e.id}>
                    {/* Tocar una evaluación abre su detalle; ahí está el botón "Editar". */}
                    <Link href={`/evaluar/${alumno.id}/${e.id}`} className="block py-3 transition-colors hover:text-acento">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{fechaCorta(e.fecha)}/{e.fecha.slice(2, 4)}</span>
                        <span className="flex items-baseline gap-1.5">
                          {e.promedio !== null && anterior !== null && <Delta valor={e.promedio - anterior} />}
                          <span className="text-lg font-semibold">{formatoNota(e.promedio)}</span>
                          <ChevronRight size={16} className="self-center text-suave" aria-hidden />
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-suave">{e.items.map((i) => `${i.criterio.nombre} ${i.valor}`).join(" · ")}</p>
                      {e.comentario && <p className="mt-1 text-sm text-suave">“{e.comentario}”</p>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {fasesAlumno.length > 0 && (
        <section className="caja space-y-3 p-4">
          <div>
            <h2 className="font-semibold">En regatas</h2>
            <p className="text-sm text-suave">Cómo le fue en cada fase, de la más vieja a la más nueva.</p>
          </div>
          <ul className="divide-y divide-borde">
            {fasesAlumno.map((f) => {
              const bien = f.valores.filter((v) => v === 3).length;
              return (
                <li key={f.nombre} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm">{f.nombre}</p>
                    <p className="text-xs text-suave">{porcentaje(bien, f.valores.length)}% bien · {f.valores.length} {f.valores.length === 1 ? "regata" : "regatas"}</p>
                  </div>
                  <div className="flex shrink-0 gap-1" aria-label={f.valores.map((v) => ["", "mala", "regular", "bien"][v]).join(", ")}>
                    {f.valores.slice(-8).map((v, i) => (
                      <span key={i} className={`size-3.5 rounded-full ${v === 3 ? "bg-ok" : v === 2 ? "bg-alerta" : "bg-peligro"}`} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
