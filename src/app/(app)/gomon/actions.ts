"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { aFechaDB, hoyAR } from "@/lib/fechas";

export type EstadoGomon = { error?: string; ok?: string };

const Texto = z.string().trim();

/** Costo en pesos: acepta "12500", "12.500" o "$ 12.500"; vacío = sin costo cargado. */
function leerCosto(crudo: FormDataEntryValue | null): { costo: number | null } | { error: string } {
  const texto = String(crudo ?? "").replace(/[\s$.]/g, "");
  if (texto === "") return { costo: null };
  if (!/^\d+$/.test(texto) || Number(texto) > 100_000_000) return { error: "El costo tiene que ser un número entero de pesos." };
  return { costo: Number(texto) };
}

function refrescar() {
  revalidatePath("/gomon");
  revalidatePath("/jornada");
}

/** Carga una observación nueva: queda PENDIENTE hasta que se marque como arreglada. */
export async function crearObservacion(embarcacionId: string, _previo: EstadoGomon, formData: FormData): Promise<EstadoGomon> {
  const instructor = await requerirInstructor();
  const embarcacion = await db.embarcacion.findUnique({ where: { id: embarcacionId }, select: { id: true, activa: true } });
  if (!embarcacion?.activa) return { error: "La embarcación no existe." };

  const descripcion = Texto.min(3, "Contá qué pasa con el bote").max(1000, "Es muy largo (máximo 1000 caracteres)").safeParse(formData.get("descripcion"));
  if (!descripcion.success) return { error: descripcion.error.issues[0].message + "." };
  const fechaTexto = String(formData.get("fecha") ?? "");
  const fecha = aFechaDB(fechaTexto);
  if (!fecha) return { error: "Elegí una fecha válida." };
  if (fechaTexto > hoyAR()) return { error: "La fecha no puede ser futura." };

  await db.mantenimiento.create({
    data: { embarcacionId, fecha, descripcion: descripcion.data, urgente: formData.get("urgente") === "on", creadoPorId: instructor.id },
  });
  refrescar();
  return { ok: "Observación cargada. Quedó como pendiente." };
}

/** Marca una observación como arreglada, con la fecha y (opcional) qué se hizo. */
export async function marcarArreglado(id: string, _previo: EstadoGomon, formData: FormData): Promise<EstadoGomon> {
  const instructor = await requerirInstructor();
  const item = await db.mantenimiento.findUnique({ where: { id }, select: { fecha: true, estado: true } });
  if (!item) return { error: "La observación no existe." };

  const fechaTexto = String(formData.get("resueltoEn") ?? "");
  const resueltoEn = aFechaDB(fechaTexto);
  if (!resueltoEn) return { error: "Elegí la fecha del arreglo." };
  if (fechaTexto > hoyAR()) return { error: "La fecha no puede ser futura." };
  if (resueltoEn < item.fecha) return { error: "El arreglo no puede ser anterior a la observación." };
  const solucion = Texto.max(1000, "Es muy largo (máximo 1000 caracteres)").safeParse(formData.get("solucion") ?? "");
  if (!solucion.success) return { error: solucion.error.issues[0].message + "." };
  const costo = leerCosto(formData.get("costo"));
  if ("error" in costo) return costo;

  await db.mantenimiento.update({
    where: { id },
    data: { estado: "ARREGLADO", resueltoEn, resueltoPorId: instructor.id, solucion: solucion.data || null, costo: costo.costo },
  });
  refrescar();
  return { ok: "Marcado como arreglado." };
}

/** Vuelve a dejar pendiente algo que se había marcado como arreglado (por ejemplo, si el problema reapareció). */
export async function reabrir(id: string) {
  await requerirInstructor();
  await db.mantenimiento.update({ where: { id }, data: { estado: "PENDIENTE", resueltoEn: null, resueltoPorId: null, solucion: null, costo: null } });
  refrescar();
}

/** Carga o corrige el costo de un arreglo ya hecho. */
export async function guardarCosto(id: string, _previo: EstadoGomon, formData: FormData): Promise<EstadoGomon> {
  await requerirInstructor();
  const costo = leerCosto(formData.get("costo"));
  if ("error" in costo) return costo;
  const r = await db.mantenimiento.updateMany({ where: { id, estado: "ARREGLADO" }, data: { costo: costo.costo } });
  if (r.count === 0) return { error: "La observación no existe o no está arreglada." };
  refrescar();
  return { ok: costo.costo === null ? "Costo borrado." : "Costo guardado." };
}

/** Borra una observación cargada por error. */
export async function eliminarObservacion(id: string) {
  await requerirInstructor();
  await db.mantenimiento.deleteMany({ where: { id } });
  refrescar();
}
