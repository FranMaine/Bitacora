import Link from "next/link";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { rachaAusencias } from "@/lib/calculos";
import { Avatar } from "@/components/avatar";
import { FormularioAlta } from "./formulario-alta";
import { ListaAlumnos, type Grupo } from "./lista-alumnos";

export const metadata = { title: "Alumnos" };

export default async function PaginaAlumnos() {
  await requerirInstructor();
  const [categorias, alumnos, asistencias] = await Promise.all([
    db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.alumno.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, categoriaId: true, activo: true } }),
    db.asistencia.findMany({
      where: { entrenamiento: { realizado: true } },
      orderBy: { entrenamiento: { fecha: "desc" } },
      select: { alumnoId: true, presente: true },
    }),
  ]);
  const activos = alumnos.filter((a) => a.activo);
  const archivados = alumnos.filter((a) => !a.activo);
  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.nombre]));

  // Faltas seguidas: miro las asistencias del alumno de más nueva a más vieja.
  const presenciasPorAlumno = new Map<string, boolean[]>();
  for (const a of asistencias) {
    const l = presenciasPorAlumno.get(a.alumnoId) ?? [];
    l.push(a.presente);
    presenciasPorAlumno.set(a.alumnoId, l);
  }
  const faltasDe = (id: string) => rachaAusencias(presenciasPorAlumno.get(id) ?? []);

  const grupos: Grupo[] = categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    alumnos: activos
      .filter((a) => a.categoriaId === c.id)
      .map((a) => ({ id: a.id, nombre: a.nombre, faltasSeguidas: faltasDe(a.id) })),
  }));

  return (
    <div className="space-y-6">
      <h1 className="display text-3xl sm:text-4xl">Alumnos</h1>

      {categorias.length > 0 ? (
        <FormularioAlta categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))} />
      ) : (
        <p className="caja p-4 text-suave">
          Primero creá una categoría en <Link href="/ajustes" className="text-acento underline">Ajustes</Link>.
        </p>
      )}

      <ListaAlumnos grupos={grupos} />

      {archivados.length > 0 && (
        <details className="caja p-4">
          <summary className="cursor-pointer font-medium">Archivados ({archivados.length})</summary>
          <ul className="mt-3 divide-y divide-borde">
            {archivados.map((a) => (
              <li key={a.id}>
                <Link href={`/alumnos/${a.id}`} className="flex min-h-12 items-center gap-3 py-2 text-suave hover:text-texto">
                  <Avatar nombre={a.nombre} tam={28} />
                  <span className="flex-1">{a.nombre}</span>
                  <span className="text-sm">{nombreCategoria.get(a.categoriaId) ?? ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
