"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { aFechaDB } from "@/lib/fechas";
import { direccionVientoValida, horaValida } from "@/lib/calculos";

export type EstadoEntrenamiento = { error?: string; guardado?: "plan" | "realizado" };

const Hora = z.string().trim().refine((h) => h === "" || horaValida(h), "Hora inválida");
const Texto = z.string().trim().max(4000);

const Datos = z.object({
  vientoDir: z.string().trim().refine((d) => d === "" || direccionVientoValida(d), "Dirección de viento inválida"),
  vientoNudos: z
    .string()
    .trim()
    .refine((n) => n === "" || (/^\d{1,2}$/.test(n) && Number(n) <= 80), "Los nudos van de 0 a 80"),
  tipo: z.enum(["ENTRENAMIENTO", "REGATA"]),
  corrienteDir: z.string().trim().refine((d) => d === "" || direccionVientoValida(d), "Dirección de corriente inválida"),
  corrienteNudos: z
    .string()
    .trim()
    .refine((n) => n === "" || (/^\d(\.\d)?$/.test(n.replace(",", ".")) && Number(n.replace(",", ".")) <= 9.9), "La corriente va de 0 a 9,9 nudos"),
  plan: Texto,
  resumen: Texto,
  horaBajada: Hora,
  horaRegreso: Hora,
});

export async function guardarEntrenamiento(
  fecha: string,
  categoriaId: string,
  _previo: EstadoEntrenamiento,
  formData: FormData,
): Promise<EstadoEntrenamiento> {
  const instructor = await requerirInstructor();
  const fechaDB = aFechaDB(fecha);
  if (!fechaDB) return { error: "Fecha inválida." };

  const parsed = Datos.safeParse({
    vientoDir: formData.get("vientoDir") ?? "",
    vientoNudos: formData.get("vientoNudos") ?? "",
    tipo: formData.get("tipo") ?? "ENTRENAMIENTO",
    corrienteDir: formData.get("corrienteDir") ?? "",
    corrienteNudos: formData.get("corrienteNudos") ?? "",
    plan: formData.get("plan") ?? "",
    resumen: formData.get("resumen") ?? "",
    horaBajada: formData.get("horaBajada") ?? "",
    horaRegreso: formData.get("horaRegreso") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message + "." };
  const { plan, resumen, horaBajada, horaRegreso, vientoDir, vientoNudos, tipo, corrienteDir, corrienteNudos } = parsed.data;
  if (horaBajada && horaRegreso && horaRegreso <= horaBajada) {
    return { error: "El regreso tiene que ser posterior a la bajada al agua." };
  }

  const realizado = formData.get("accion") === "realizado";
  if (realizado && (!horaBajada || !horaRegreso)) {
    return { error: "Para dar el entrenamiento por realizado cargá la hora de bajada y la de regreso." };
  }

  const categoria = await db.categoria.findUnique({ where: { id: categoriaId }, select: { id: true } });
  if (!categoria) return { error: "La categoría no existe." };

  // Solo se aceptan ids que existen: alumnos de ESTA categoría y temas activos o ya cargados.
  const alumnosListados = formData.getAll("alumno").map(String);
  const presentes = new Set(formData.getAll("presente").map(String));
  const alumnosValidos = new Set(
    (await db.alumno.findMany({ where: { id: { in: alumnosListados }, categoriaId }, select: { id: true } })).map((a) => a.id),
  );
  const plani = new Set(formData.getAll("temaPlan").map(String));
  const hechos = new Set(formData.getAll("temaHecho").map(String));
  const temasValidos = new Set(
    (await db.tema.findMany({ where: { id: { in: [...plani, ...hechos] } }, select: { id: true } })).map((t) => t.id),
  );

  // Calificaciones por fase (solo en días de regata): "fase_<alumnoId>__<faseId>" = 1 mala, 2 regular, 3 bien.
  const califs: { alumnoId: string; faseId: string; valor: number }[] = [];
  if (tipo === "REGATA") {
    const fasesValidas = new Set((await db.faseRegata.findMany({ select: { id: true } })).map((f) => f.id));
    for (const [clave, crudo] of formData.entries()) {
      const m = /^fase_(.+)__(.+)$/.exec(clave);
      if (!m) continue;
      const [, alumnoId, faseId] = m;
      const valor = Number(crudo);
      if (!alumnosValidos.has(alumnoId) || !fasesValidas.has(faseId) || ![1, 2, 3].includes(valor)) continue;
      califs.push({ alumnoId, faseId, valor });
    }
  }

  const datos = {
    horaBajada: horaBajada || null,
    horaRegreso: horaRegreso || null,
    vientoDir: vientoDir || null,
    vientoNudos: vientoNudos === "" ? null : Number(vientoNudos),
    tipo,
    // La corriente solo se anota en los días de regata.
    corrienteDir: tipo === "REGATA" ? corrienteDir || null : null,
    corrienteNudos: tipo === "REGATA" && corrienteNudos !== "" ? Number(corrienteNudos.replace(",", ".")) : null,
    plan: plan || null,
    resumen: resumen || null,
  };

  await db.$transaction(async (tx) => {
    const e = await tx.entrenamiento.upsert({
      where: { fecha_categoriaId: { fecha: fechaDB, categoriaId } },
      // "Guardar plan" sobre un entrenamiento ya realizado no lo des-marca.
      update: realizado ? { ...datos, realizado: true } : datos,
      create: { ...datos, realizado, fecha: fechaDB, categoriaId, creadoPorId: instructor.id },
      select: { id: true },
    });
    await tx.entrenamientoTema.deleteMany({ where: { entrenamientoId: e.id } });
    await tx.asistencia.deleteMany({ where: { entrenamientoId: e.id } });
    const idsTemas = [...new Set([...plani, ...hechos])].filter((id) => temasValidos.has(id));
    await tx.entrenamientoTema.createMany({
      data: idsTemas.map((temaId) => ({
        entrenamientoId: e.id,
        temaId,
        planificado: plani.has(temaId),
        realizado: hechos.has(temaId),
      })),
    });
    await tx.notaFase.deleteMany({ where: { entrenamientoId: e.id } });
    if (califs.length) await tx.notaFase.createMany({ data: califs.map((c) => ({ entrenamientoId: e.id, ...c })) });
    await tx.asistencia.createMany({
      data: [...alumnosValidos].map((alumnoId) => {
        const nota = String(formData.get(`nota_${alumnoId}`) ?? "").trim().slice(0, 500);
        return {
          entrenamientoId: e.id,
          alumnoId,
          presente: presentes.has(alumnoId),
          nota: nota || null,
        };
      }),
    });
  });

  revalidatePath("/jornada");
  revalidatePath("/estadisticas");
  revalidatePath(`/entrenamiento/${fecha}/${categoriaId}`);
  return { guardado: realizado ? "realizado" : "plan" };
}
