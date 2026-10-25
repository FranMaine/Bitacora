import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { deFechaDB, hoyAR, fechaLarga } from "@/lib/fechas";
import { LogoClase } from "@/components/logo-clase";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { eliminarEvaluacion } from "./actions";
import { FormularioEvaluacion } from "./formulario";

export const metadata = { title: "Evaluar alumno" };

export default async function PaginaEvaluarAlumno({
  params,
  searchParams,
}: {
  params: Promise<{ alumnoId: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  await requerirInstructor();
  const { alumnoId } = await params;
  const { id: evaluacionId } = await searchParams;

  const alumno = await db.alumno.findUnique({ where: { id: alumnoId }, include: { categoria: true } });
  if (!alumno) notFound();

  const [editando, ultima, criterios] = await Promise.all([
    evaluacionId ? db.evaluacion.findFirst({ where: { id: evaluacionId, alumnoId }, include: { items: true } }) : null,
    // Para mostrar "Última vez": la evaluación más reciente (anterior a la que se edita).
    db.evaluacion.findFirst({
      where: { alumnoId, ...(evaluacionId ? { id: { not: evaluacionId } } : {}) },
      orderBy: { fecha: "desc" },
      include: { items: true },
    }),
    db.criterio.findMany({ orderBy: { orden: "asc" } }),
  ]);
  if (evaluacionId && !editando) notFound();

  const valorActual = new Map(editando?.items.map((i) => [i.criterioId, i.valor]));
  const valorUltimo = new Map(ultima?.items.map((i) => [i.criterioId, i.valor]));
  // Criterios archivados solo aparecen si ya tenían nota en esta evaluación (para no perderla).
  const visibles = criterios.filter((c) => c.activo || valorActual.has(c.id));
  const hoy = hoyAR();

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/alumnos/${alumnoId}`} className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft size={16} aria-hidden /> {alumno.nombre}
        </Link>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{editando ? "Editar evaluación" : "Nueva evaluación"}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-suave">
          <span className="flex size-5 items-center justify-center" aria-hidden>
            <LogoClase nombre={alumno.categoria.nombre} tam={18} />
          </span>
          {alumno.nombre} · {alumno.categoria.nombre}
          {editando && <span className="first-letter:uppercase"> · {fechaLarga(deFechaDB(editando.fecha))}</span>}
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="caja p-4 text-suave">
          No hay criterios de evaluación. Creá los primeros en <Link href="/ajustes" className="text-acento underline">Ajustes</Link>.
        </p>
      ) : (
        <FormularioEvaluacion
          alumnoId={alumnoId}
          evaluacionId={editando?.id ?? null}
          fecha={editando ? deFechaDB(editando.fecha) : hoy}
          hoy={hoy}
          criterios={visibles.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            valor: valorActual.get(c.id) ?? null,
            anterior: valorUltimo.get(c.id) ?? null,
          }))}
          comentario={editando?.comentario ?? ""}
        />
      )}

      {editando && (
        <form action={eliminarEvaluacion.bind(null, alumnoId, editando.id)}>
          <BotonConfirmar mensaje="¿Eliminar esta evaluación? No se puede deshacer." className="boton boton-peligro">
            <Trash2 size={16} aria-hidden /> Eliminar esta evaluación
          </BotonConfirmar>
        </form>
      )}
    </div>
  );
}
