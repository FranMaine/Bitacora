"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { crearSesion, borrarSesion } from "@/lib/session";

const Datos = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

// Se compara contra un hash cualquiera aunque el email no exista, así el tiempo
// de respuesta no delata qué emails están registrados.
const HASH_FALSO = bcrypt.hashSync("clave-que-nadie-usa", 10);

export type EstadoLogin = { error?: string };

export async function iniciarSesion(_previo: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const datos = Datos.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!datos.success) return { error: "Revisá el email y la contraseña." };

  const instructor = await db.instructor.findUnique({ where: { email: datos.data.email } });
  const ok = await bcrypt.compare(datos.data.password, instructor?.passwordHash ?? HASH_FALSO);
  if (!instructor || !instructor.activo || !ok) return { error: "Email o contraseña incorrectos." };

  await crearSesion(instructor.id);
  redirect("/");
}

export async function cerrarSesion() {
  await borrarSesion();
  redirect("/login");
}
