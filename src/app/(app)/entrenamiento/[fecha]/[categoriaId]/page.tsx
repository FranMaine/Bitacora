import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { aFechaDB, fechaLarga } from "@/lib/fechas";
import { LogoClase } from "@/components/logo-clase";
import { FormularioEntrenamiento } from "./formulario";

export const metadata = { title: "Entrenamiento" };

export default async function PaginaEntrenamiento({ params }: { params: Promise<{ fecha: string; categoriaId: string }> }) {
  await requerirInstructor();
  const { fecha, categoriaId } = await params;
  const fechaDB = aFechaDB(fecha);
  if (!fechaDB) notFound();

  const categoria = await db.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria) notFound();

  const [entrenamiento, temas] = await Promise.all([
    db.entrenamiento.findUnique({
      where: { fecha_categoriaId: { fecha: fechaDB, categoriaId } },
      include: { temas: true, asistencias: true },
    }),
    db.tema.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
  ]);

  // Alumnos activos de la categoría, más los archivados que ya figuraban en este día.
  const idsPrevios = entrenamiento?.asistencias.map((a) => a.alumnoId) ?? [];
  const alumnos = await db.alumno.findMany({
    where: { categoriaId, OR: [{ activo: true }, { id: { in: idsPrevios } }] },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  // Temas archivados que igual figuran en este entrenamiento se siguen mostrando.
  const idsTemasUsados = new Set(entrenamiento?.temas.map((t) => t.temaId) ?? []);
  const temasExtra = idsTemasUsados.size
    ? await db.tema.findMany({ where: { id: { in: [...idsTemasUsados] }, activo: false } })
    : [];
  const listaTemas = [...temas, ...temasExtra].map((t) => ({ id: t.id, nombre: t.nombre }));

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/?fecha=${fecha}`} className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft size={16} aria-hidden /> Volver
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-acento-suave text-acento" aria-hidden>
            <LogoClase nombre={categoria.nombre} tam={34} />
          </span>
          <h1 className="display text-3xl sm:text-4xl">{categoria.nombre}</h1>
        </div>
        <p className="mt-1 text-suave first-letter:uppercase">{fechaLarga(fecha)}</p>
      </div>
      <FormularioEntrenamiento
        fecha={fecha}
        categoriaId={categoriaId}
        alumnos={alumnos}
        temas={listaTemas}
        inicial={{
          plan: entrenamiento?.plan ?? "",
          resumen: entrenamiento?.resumen ?? "",
          horaBajada: entrenamiento?.horaBajada ?? "",
          horaRegreso: entrenamiento?.horaRegreso ?? "",
          vientoDir: entrenamiento?.vientoDir ?? "",
          vientoNudos: entrenamiento?.vientoNudos != null ? String(entrenamiento.vientoNudos) : "",
          realizado: entrenamiento?.realizado ?? false,
          existe: Boolean(entrenamiento),
          temasPlan: entrenamiento?.temas.filter((t) => t.planificado).map((t) => t.temaId) ?? [],
          temasHecho: entrenamiento?.temas.filter((t) => t.realizado).map((t) => t.temaId) ?? [],
          presentes: entrenamiento?.asistencias.filter((a) => a.presente).map((a) => a.alumnoId) ?? [],
          notas: Object.fromEntries((entrenamiento?.asistencias ?? []).filter((a) => a.nota).map((a) => [a.alumnoId, a.nota as string])),
        }}
      />
    </div>
  );
}
