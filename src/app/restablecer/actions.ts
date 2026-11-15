"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { crearSesion } from "@/lib/session";
import { hashToken } from "@/lib/reseteo";

export type EstadoRestablecer = { error?: string };

const Clave = z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres").max(100, "La contraseña es muy larga");

export async function restablecerClave(token: string, _previo: EstadoRestablecer, formData: FormData): Promise<EstadoRestablecer> {
  const clave = Clave.safeParse(formData.get("nueva"));
  if (!clave.success) return { error: clave.error.issues[0].message + "." };
  if (formData.get("nueva") !== formData.get("repetir")) return { error: "Las dos contraseñas no coinciden." };

  const hash = hashToken(token);
  const ahora = new Date();
  const registro = await db.reseteoClave.findUnique({ where: { tokenHash: hash }, select: { instructorId: true, usadoEn: true, expiraEn: true } });
  if (!registro || registro.usadoEn || registro.expiraEn <= ahora) {
    return { error: "El link venció o ya se usó. Pedí uno nuevo desde el login." };
  }

  // El link se "gasta" de forma atómica: si dos pedidos llegan a la vez, solo uno lo consigue.
  const gastado = await db.reseteoClave.updateMany({ where: { tokenHash: hash, usadoEn: null, expiraEn: { gt: ahora } }, data: { usadoEn: ahora } });
  if (gastado.count !== 1) return { error: "El link venció o ya se usó. Pedí uno nuevo desde el login." };

  const instructor = await db.instructor.findUnique({ where: { id: registro.instructorId }, select: { id: true, activo: true } });
  if (!instructor?.activo) return { error: "Esta cuenta está desactivada." };

  await db.$transaction([
    db.instructor.update({ where: { id: instructor.id }, data: { passwordHash: await bcrypt.hash(clave.data, 10) } }),
    db.reseteoClave.deleteMany({ where: { instructorId: instructor.id } }),
  ]);

  // Tener el link del mail prueba que controla el mail: queda con la sesión iniciada.
  await crearSesion(instructor.id);
  redirect("/");
}
