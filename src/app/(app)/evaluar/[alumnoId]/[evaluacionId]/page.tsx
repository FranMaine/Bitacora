import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { deFechaDB, fechaCorta, fechaLarga } from "@/lib/fechas";
import { formatoNota, formatoTendencia, promedio } from "@/lib/calculos";
import { LogoClase } from "@/components/logo-clase";

export const metadata = { title: "Evaluación" };

function Delta({ valor }: { valor: number | null }) {
  const t = formatoTendencia(valor);
  if (!t || t === "=") return <span className="text-xs text-suave">igual</span>;
  return <span className={`text-xs font-medium ${t.startsWith("+") ? "text-ok" : "text-peligro"}`}>{t}</span>;
}

export default async function DetalleEvaluacion({ params }: { params: Promise<{ alumnoId: string; evaluacionId: string }> }) {
  await requerirInstructor();
  const { alumnoId, evaluacionId } = await params;

  const evaluacion = await db.evaluacion.findFirst({
    where: { id: evaluacionId, alumnoId },
    include: {
      alumno: { include: { categoria: true } },
      instructor: { select: { nombre: true } },
      items: { include: { criterio: { select: { id: true, nombre: true, orden: true } } } },
    },
  });
  if (!evaluacion) notFound();

  // La evaluación inmediatamente anterior de este alumno: con ella se compara.
  const anterior = await db.evaluacion.findFirst({
    where: {
      alumnoId,
      id: { not: evaluacionId },
      OR: [{ fecha: { lt: evaluacion.fecha } }, { fecha: evaluacion.fecha, createdAt: { lt: evaluacion.createdAt } }],
    },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    include: { items: true },
  });

  const items = [...evaluacion.items].sort((a, b) => a.criterio.orden - b.criterio.orden);
  const valorAnterior = new Map(anterior?.items.map((i) => [i.criterioId, i.valor]));
  const prom = promedio(items.map((i) => i.valor));
  const promAnterior = anterior ? promedio(anterior.items.map((i) => i.valor)) : null;

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/alumnos/${alumnoId}`} className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft size={16} aria-hidden /> {evaluacion.alumno.nombre}
        </Link>
        <h1 className="display mt-2 text-3xl first-letter:uppercase sm:text-4xl">{fechaLarga(deFechaDB(evaluacion.fecha))}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-suave">
          <span className="flex size-5 items-center justify-center" aria-hidden>
            <LogoClase nombre={evaluacion.alumno.categoria.nombre} tam={18} />
          </span>
          {evaluacion.alumno.nombre} · evaluó {evaluacion.instructor.nombre}
        </p>
      </div>

      <section className="caja p-4">
        <p className="text-xs text-suave">Promedio</p>
        <p className="flex items-baseline gap-2 text-3xl font-semibold">
          {formatoNota(prom)}
          {prom !== null && promAnterior !== null && <Delta valor={prom - promAnterior} />}
        </p>
        <p className="mt-1 text-sm text-suave">
          {anterior
            ? `Comparado con la evaluación del ${fechaCorta(deFechaDB(anterior.fecha))} (${formatoNota(promAnterior)}).`
            : "Es la primera evaluación de este alumno: todavía no hay con qué compararla."}
        </p>
      </section>

      <section className="caja p-4">
        <h2 className="mb-1 font-semibold">Notas por criterio</h2>
        <ul className="divide-y divide-borde">
          {items.map((i) => {
            const prev = valorAnterior.get(i.criterioId);
            return (
              <li key={i.criterioId} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span>{i.criterio.nombre}</span>
                  <span className="flex items-baseline gap-2">
                    {prev !== undefined && <Delta valor={i.valor - prev} />}
                    <span className="text-lg font-semibold">{i.valor}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-borde" aria-hidden>
                  <div className="h-full rounded-full bg-acento" style={{ width: `${i.valor * 10}%` }} />
                </div>
                {prev !== undefined && <p className="mt-1 text-xs text-suave">Antes: {prev}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      {evaluacion.comentario && (
        <section className="caja p-4">
          <h2 className="mb-1 font-semibold">Comentario</h2>
          <p className="whitespace-pre-wrap text-sm">{evaluacion.comentario}</p>
        </section>
      )}

      <Link href={`/evaluar/${alumnoId}?id=${evaluacion.id}`} className="boton w-full">
        <Pencil size={16} aria-hidden /> Editar esta evaluación
      </Link>
    </div>
  );
}
