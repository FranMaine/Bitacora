"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { periodoValido } from "@/lib/fechas";

export type EstadoEvaluacion = { error?: string };

const Nota = z.coerce.number().int().min(1).max(10);

export async function guardarEvaluacion(
  alumnoId: string,
  periodo: string,
  _previo: EstadoEvaluacion,
  formData: FormData,
): Promise<EstadoEvaluacion> {
  const instructor = await requerirInstructor();
  if (!periodoValido(periodo)) return { error: "Período inválido." };
  const alumno = await db.alumno.findUnique({ where: { id: alumnoId }, select: { id: true, categoriaId: true } });
  if (!alumno) return { error: "El alumno no existe." };

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
    const ev = await tx.evaluacion.upsert({
      where: { alumnoId_periodo: { alumnoId, periodo } },
      update: { comentario, instructorId: instructor.id },
      create: { alumnoId, periodo, comentario, instructorId: instructor.id },
      select: { id: true },
    });
    await tx.evaluacionItem.deleteMany({ where: { evaluacionId: ev.id } });
    await tx.evaluacionItem.createMany({ data: valores.map((v) => ({ evaluacionId: ev.id, ...v })) });
  });

  redirect(`/evaluar?periodo=${periodo}&categoria=${alumno.categoriaId}`);
}
