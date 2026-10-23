"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";

export type EstadoAjustes = { error?: string; ok?: string };
export type TipoCatalogo = "categoria" | "tema" | "criterio" | "fase";

const Nombre = z.string().trim().min(2, "El nombre es muy corto").max(60, "El nombre es muy largo");

function esDuplicado(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}

// Las tres listas (categorías, temas, criterios) funcionan igual: nombre único, orden y archivado.
async function crear(tipo: TipoCatalogo, nombre: string) {
  const data = { nombre };
  if (tipo === "categoria") {
    const orden = ((await db.categoria.aggregate({ _max: { orden: true } }))._max.orden ?? -1) + 1;
    await db.categoria.create({ data: { ...data, orden } });
  } else if (tipo === "tema") {
    const orden = ((await db.tema.aggregate({ _max: { orden: true } }))._max.orden ?? -1) + 1;
    await db.tema.create({ data: { ...data, orden } });
  } else if (tipo === "fase") {
    const orden = ((await db.faseRegata.aggregate({ _max: { orden: true } }))._max.orden ?? -1) + 1;
    await db.faseRegata.create({ data: { ...data, orden } });
  } else {
    const orden = ((await db.criterio.aggregate({ _max: { orden: true } }))._max.orden ?? -1) + 1;
    await db.criterio.create({ data: { ...data, orden } });
  }
}

async function actualizar(tipo: TipoCatalogo, id: string, data: { nombre?: string; activo?: boolean }) {
  if (tipo === "categoria") {
    await db.categoria.update({ where: { id }, data: { nombre: data.nombre, activa: data.activo } });
  } else if (tipo === "tema") {
    await db.tema.update({ where: { id }, data });
  } else if (tipo === "fase") {
    await db.faseRegata.update({ where: { id }, data: { nombre: data.nombre, activa: data.activo } });
  } else {
    await db.criterio.update({ where: { id }, data });
  }
}

export async function agregarItem(tipo: TipoCatalogo, _previo: EstadoAjustes, formData: FormData): Promise<EstadoAjustes> {
  await requerirInstructor();
  const r = Nombre.safeParse(formData.get("nombre"));
  if (!r.success) return { error: r.error.issues[0].message + "." };
  try {
    await crear(tipo, r.data);
  } catch (e) {
    if (esDuplicado(e)) return { error: "Ya existe uno con ese nombre." };
    throw e;
  }
  revalidatePath("/ajustes");
  return { ok: "Agregado." };
}

export async function renombrarItem(tipo: TipoCatalogo, id: string, formData: FormData) {
  await requerirInstructor();
  const r = Nombre.safeParse(formData.get("nombre"));
  if (!r.success) return;
  try {
    await actualizar(tipo, id, { nombre: r.data });
  } catch (e) {
    if (!esDuplicado(e)) throw e;
  }
  revalidatePath("/ajustes");
}

export async function cambiarActivoItem(tipo: TipoCatalogo, id: string, activo: boolean) {
  await requerirInstructor();
  await actualizar(tipo, id, { activo });
  revalidatePath("/ajustes");
}

const NuevoInstructor = z.object({
  nombre: Nombre,
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
});

export async function agregarInstructor(_previo: EstadoAjustes, formData: FormData): Promise<EstadoAjustes> {
  await requerirInstructor();
  const r = NuevoInstructor.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!r.success) return { error: r.error.issues[0].message + "." };
  try {
    await db.instructor.create({ data: { nombre: r.data.nombre, email: r.data.email, passwordHash: await bcrypt.hash(r.data.password, 10) } });
  } catch (e) {
    if (esDuplicado(e)) return { error: "Ya hay un instructor con ese email." };
    throw e;
  }
  revalidatePath("/ajustes");
  return { ok: "Instructor agregado. Pasale la contraseña por un canal privado." };
}

export async function cambiarActivoInstructor(id: string, activo: boolean) {
  const yo = await requerirInstructor();
  if (id === yo.id) return; // nadie se puede desactivar a sí mismo (quedaría la app sin acceso)
  await db.instructor.update({ where: { id }, data: { activo } });
  revalidatePath("/ajustes");
}

const CambioClave = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres").max(100),
});

export async function cambiarMiClave(_previo: EstadoAjustes, formData: FormData): Promise<EstadoAjustes> {
  const yo = await requerirInstructor();
  const r = CambioClave.safeParse({ actual: formData.get("actual"), nueva: formData.get("nueva") });
  if (!r.success) return { error: r.error.issues[0].message + "." };
  const fila = await db.instructor.findUnique({ where: { id: yo.id }, select: { passwordHash: true } });
  if (!fila || !(await bcrypt.compare(r.data.actual, fila.passwordHash))) return { error: "La contraseña actual no es correcta." };
  await db.instructor.update({ where: { id: yo.id }, data: { passwordHash: await bcrypt.hash(r.data.nueva, 10) } });
  return { ok: "Contraseña cambiada." };
}
