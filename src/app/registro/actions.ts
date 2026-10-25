"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { crearSesion } from "@/lib/session";

export type EstadoRegistro = { error?: string };

const Datos = z.object({
  nombre: z.string().trim().min(2, "Escribí tu nombre completo").max(80),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  codigo: z.string().max(100).optional(),
  password: z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres").max(100),
});

function esDuplicado(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}

export async function registrarse(_previo: EstadoRegistro, formData: FormData): Promise<EstadoRegistro> {
  const r = Datos.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    codigo: String(formData.get("codigo") ?? ""),
  });
  if (!r.success) return { error: r.error.issues[0].message + "." };

  // Si hay un CODIGO_REGISTRO configurado, solo se crea la cuenta con ese código
  // (el club lo reparte a los instructores). Sin configurar, el registro queda abierto.
  const esperado = process.env.CODIGO_REGISTRO;
  if (esperado) {
    const a = Buffer.from(r.data.codigo ?? "");
    const b = Buffer.from(esperado);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: "El código de invitación no es correcto." };
  }

  const passwordHash = await bcrypt.hash(r.data.password, 10);
  let instructor;
  try {
    instructor = await db.instructor.create({
      data: { nombre: r.data.nombre, email: r.data.email, passwordHash },
    });
  } catch (e) {
    if (esDuplicado(e)) return { error: "Ya hay una cuenta con ese email. Entrá desde el login." };
    throw e;
  }
  await crearSesion(instructor.id);
  redirect("/");
}
