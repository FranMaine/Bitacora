"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";

export type EstadoForm = { error?: string; ok?: string };

const Nombre = z.string().trim().min(2, "El nombre es muy corto").max(80, "El nombre es muy largo");

/** Carga uno o varios alumnos: un nombre por línea. */
export async function agregarAlumnos(_previo: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requerirInstructor();
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const categoria = await db.categoria.findUnique({ where: { id: categoriaId }, select: { id: true } });
  if (!categoria) return { error: "Elegí una categoría." };

  const nombres = String(formData.get("nombres") ?? "")
    .split(/\r?\n/)
    .map((n) => n.trim())
    .filter(Boolean);
  if (nombres.length === 0) return { error: "Escribí al menos un nombre." };
  if (nombres.length > 60) return { error: "Son demasiados de una vez (máximo 60)." };
  for (const n of nombres) {
    const r = Nombre.safeParse(n);
    if (!r.success) return { error: `"${n}": ${r.error.issues[0].message}.` };
  }

  // Si ya existe uno activo con el mismo nombre en esa categoría, no se duplica.
  const existentes = await db.alumno.findMany({ where: { categoriaId, activo: true }, select: { nombre: true } });
  const yaEstan = new Set(existentes.map((a) => a.nombre.toLowerCase()));
  const nuevos = [...new Set(nombres)].filter((n) => !yaEstan.has(n.toLowerCase()));
  if (nuevos.length) await db.alumno.createMany({ data: nuevos.map((nombre) => ({ nombre, categoriaId })) });

  revalidatePath("/alumnos");
  const omitidos = nombres.length - nuevos.length;
  return { ok: `${nuevos.length} ${nuevos.length === 1 ? "alumno agregado" : "alumnos agregados"}${omitidos ? ` (${omitidos} ya estaba${omitidos === 1 ? "" : "n"})` : ""}.` };
}

const Edicion = z.object({
  nombre: Nombre,
  categoriaId: z.string().min(1),
  notas: z.string().trim().max(2000),
});

export async function guardarAlumno(id: string, _previo: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requerirInstructor();
  const r = Edicion.safeParse({
    nombre: formData.get("nombre"),
    categoriaId: formData.get("categoriaId"),
    notas: formData.get("notas") ?? "",
  });
  if (!r.success) return { error: r.error.issues[0].message + "." };
  const categoria = await db.categoria.findUnique({ where: { id: r.data.categoriaId }, select: { id: true } });
  if (!categoria) return { error: "La categoría no existe." };

  await db.alumno.update({ where: { id }, data: { nombre: r.data.nombre, categoriaId: r.data.categoriaId, notas: r.data.notas || null } });
  revalidatePath("/alumnos");
  revalidatePath(`/alumnos/${id}`);
  return { ok: "Guardado." };
}

/** Archivar (el alumno deja de aparecer en las listas pero conserva su historial) o reactivar. */
export async function cambiarEstadoAlumno(id: string, activo: boolean) {
  await requerirInstructor();
  await db.alumno.update({ where: { id }, data: { activo } });
  revalidatePath("/alumnos");
  redirect(activo ? `/alumnos/${id}` : "/alumnos");
}
