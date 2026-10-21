import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { nombrePeriodo, periodoActual, periodoAnterior, periodoValido } from "@/lib/fechas";
import { FormularioEvaluacion } from "./formulario";

export const metadata = { title: "Evaluar alumno" };

export default async function PaginaEvaluarAlumno({
  params,
  searchParams,
}: {
  params: Promise<{ alumnoId: string }>;
  searchParams: Promise<{ periodo?: string }>;
}) {
  await requerirInstructor();
  const { alumnoId } = await params;
  const { periodo: pedido } = await searchParams;
  const periodo = pedido && periodoValido(pedido) ? pedido : periodoActual();

  const alumno = await db.alumno.findUnique({ where: { id: alumnoId }, include: { categoria: true } });
  if (!alumno) notFound();

  const [actual, anterior, criterios] = await Promise.all([
    db.evaluacion.findUnique({ where: { alumnoId_periodo: { alumnoId, periodo } }, include: { items: true } }),
    db.evaluacion.findUnique({ where: { alumnoId_periodo: { alumnoId, periodo: periodoAnterior(periodo) } }, include: { items: true } }),
    db.criterio.findMany({ orderBy: { orden: "asc" } }),
  ]);

  const valorActual = new Map(actual?.items.map((i) => [i.criterioId, i.valor]));
  const valorAnterior = new Map(anterior?.items.map((i) => [i.criterioId, i.valor]));
  // Criterios archivados solo aparecen si ya tenían nota en esta evaluación (para no perderla).
  const visibles = criterios.filter((c) => c.activo || valorActual.has(c.id));

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/evaluar?periodo=${periodo}&categoria=${alumno.categoriaId}`} className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft size={16} aria-hidden /> Evaluar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{alumno.nombre}</h1>
        <p className="text-suave">
          {alumno.categoria.nombre} · <span className="first-letter:uppercase">{nombrePeriodo(periodo)}</span>
        </p>
      </div>
      {visibles.length === 0 ? (
        <p className="caja p-4 text-suave">
          No hay criterios de evaluación. Creá los primeros en <Link href="/ajustes" className="text-acento underline">Ajustes</Link>.
        </p>
      ) : (
        <FormularioEvaluacion
          alumnoId={alumnoId}
          periodo={periodo}
          criterios={visibles.map((c) => ({ id: c.id, nombre: c.nombre, valor: valorActual.get(c.id) ?? null, anterior: valorAnterior.get(c.id) ?? null }))}
          comentario={actual?.comentario ?? ""}
        />
      )}
    </div>
  );
}
