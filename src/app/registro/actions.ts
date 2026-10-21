"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { crearSesion } from "@/lib/session";

export type EstadoRegistro = { error?: string };

const Datos = z.object({
  nombre: z.string().trim().min(2, "Escribí tu nombre completo").max(80),
  email: z.string().trim().toLowerCase().email("Email inválido"),
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
  });
  if (!r.success) return { error: r.error.issues[0].message + "." };

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
