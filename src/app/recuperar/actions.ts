"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { enviarMail, mailReseteo } from "@/lib/mail";
import { MAXIMO_PEDIDOS_POR_HORA, enlaceDeReseteo, nuevoToken, vencimiento } from "@/lib/reseteo";

export type EstadoRecuperar = { error?: string; ok?: string };

const Email = z.string().trim().toLowerCase().email();

// Siempre se responde lo mismo, exista o no el mail: así nadie puede averiguar quién es instructor.
const RESPUESTA = "Si ese mail tiene una cuenta, te mandamos un link para elegir una contraseña nueva. Revisá también la carpeta de spam.";

export async function pedirReseteo(_previo: EstadoRecuperar, formData: FormData): Promise<EstadoRecuperar> {
  const r = Email.safeParse(formData.get("email"));
  if (!r.success) return { error: "Escribí un email válido." };

  const instructor = await db.instructor.findUnique({ where: { email: r.data }, select: { id: true, nombre: true, email: true, activo: true } });
  if (!instructor?.activo) return { ok: RESPUESTA };

  const haceUnaHora = new Date(Date.now() - 60 * 60_000);
  const recientes = await db.reseteoClave.count({ where: { instructorId: instructor.id, createdAt: { gt: haceUnaHora } } });
  if (recientes >= MAXIMO_PEDIDOS_POR_HORA) return { ok: RESPUESTA };

  const { token, hash } = nuevoToken();
  // Un solo link válido por persona: el pedido nuevo invalida los anteriores sin usar.
  await db.$transaction([
    db.reseteoClave.deleteMany({ where: { instructorId: instructor.id, usadoEn: null } }),
    db.reseteoClave.create({ data: { instructorId: instructor.id, tokenHash: hash, expiraEn: vencimiento() } }),
  ]);

  const envio = await enviarMail(instructor.email, mailReseteo(instructor.nombre, enlaceDeReseteo(token)));
  if (!envio.ok) console.error("No se pudo enviar el mail de recuperación:", envio.motivo);
  return { ok: RESPUESTA };
}
