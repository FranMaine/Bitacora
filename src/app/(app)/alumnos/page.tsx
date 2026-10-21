import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { FormularioAlta } from "./formulario-alta";

export const metadata = { title: "Alumnos" };

export default async function PaginaAlumnos() {
  await requerirInstructor();
  const [categorias, alumnos] = await Promise.all([
    db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.alumno.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, categoriaId: true, activo: true } }),
  ]);
  const activos = alumnos.filter((a) => a.activo);
  const archivados = alumnos.filter((a) => !a.activo);
  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.nombre]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Alumnos</h1>

      {categorias.length > 0 ? (
        <FormularioAlta categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))} />
      ) : (
        <p className="caja p-4 text-suave">
          Primero creá una categoría en <Link href="/ajustes" className="text-acento underline">Ajustes</Link>.
        </p>
      )}

      {categorias.map((c) => {
        const lista = activos.filter((a) => a.categoriaId === c.id);
        return (
          <section key={c.id}>
            <h2 className="mb-2 flex items-baseline gap-2 font-semibold">
              {c.nombre} <span className="text-sm font-normal text-suave">{lista.length}</span>
            </h2>
            {lista.length === 0 ? (
              <p className="text-sm text-suave">Sin alumnos todavía.</p>
            ) : (
              <ul className="caja divide-y divide-borde">
                {lista.map((a) => (
                  <li key={a.id}>
                    <Link href={`/alumnos/${a.id}`} className="flex min-h-12 items-center justify-between px-4 py-2 hover:bg-acento-suave">
                      {a.nombre}
                      <ChevronRight size={18} className="text-suave" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {archivados.length > 0 && (
        <details className="caja p-4">
          <summary className="cursor-pointer font-medium">Archivados ({archivados.length})</summary>
          <ul className="mt-3 divide-y divide-borde">
            {archivados.map((a) => (
              <li key={a.id}>
                <Link href={`/alumnos/${a.id}`} className="flex min-h-11 items-center justify-between py-2 text-suave hover:text-texto">
                  <span>{a.nombre}</span>
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
