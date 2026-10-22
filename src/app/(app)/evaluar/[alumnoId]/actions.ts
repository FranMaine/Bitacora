"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { aFechaDB, hoyAR } from "@/lib/fechas";

export type EstadoEvaluacion = { error?: string };

const Nota = z.coerce.number().int().min(1).max(10);

/** Crea una evaluación nueva (evaluacionId = null) o edita una existente. */
export async function guardarEvaluacion(
  alumnoId: string,
  evaluacionId: string | null,
  _previo: EstadoEvaluacion,
  formData: FormData,
): Promise<EstadoEvaluacion> {
  const instructor = await requerirInstructor();
  const alumno = await db.alumno.findUnique({ where: { id: alumnoId }, select: { id: true } });
  if (!alumno) return { error: "El alumno no existe." };

  const fechaTexto = String(formData.get("fecha") ?? "");
  const fecha = aFechaDB(fechaTexto);
  if (!fecha) return { error: "Elegí una fecha válida." };
  if (fechaTexto > hoyAR()) return { error: "La fecha no puede ser futura." };

  // Cada criterio llega como "nota_<id>"; solo se guardan los que tienen nota 1–10.
  const criterios = await db.criterio.findMany({ select: { id: true } });
  const valores: { criterioId: string; valor: number }[] = [];
  for (const c of criterios) {
    const crudo = formData.get(`nota_${c.id}`);
    if (crudo === null || crudo === "") continue;
    const r = Nota.safeParse(crudo);
    if (!r.success) return { error: "Las notas van del 1 al 10." };
    valores.push({ criterioId: c.id, valor: r.data });
  }
  if (valores.length === 0) return { error: "Poné al menos una nota." };

  const comentario = String(formData.get("comentario") ?? "").trim().slice(0, 4000) || null;

  await db.$transaction(async (tx) => {
    let id = evaluacionId;
    if (id) {
      // Solo se edita una evaluación de ESTE alumno.
      const existe = await tx.evaluacion.findFirst({ where: { id, alumnoId }, select: { id: true } });
      if (!existe) throw new Error("Evaluación inexistente");
      await tx.evaluacion.update({ where: { id }, data: { fecha, comentario, instructorId: instructor.id } });
      await tx.evaluacionItem.deleteMany({ where: { evaluacionId: id } });
    } else {
      id = (await tx.evaluacion.create({ data: { alumnoId, fecha, comentario, instructorId: instructor.id }, select: { id: true } })).id;
    }
    await tx.evaluacionItem.createMany({ data: valores.map((v) => ({ evaluacionId: id!, ...v })) });
  });

  revalidatePath("/evaluar");
  revalidatePath(`/alumnos/${alumnoId}`);
  redirect(`/alumnos/${alumnoId}`);
}

export async function eliminarEvaluacion(alumnoId: string, evaluacionId: string) {
  await requerirInstructor();
  await db.evaluacion.deleteMany({ where: { id: evaluacionId, alumnoId } });
  revalidatePath("/evaluar");
  revalidatePath(`/alumnos/${alumnoId}`);
  redirect(`/alumnos/${alumnoId}`);
}
