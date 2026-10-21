import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { idDeSesion } from "@/lib/session";

/**
 * Instructor logueado (y activo) o redirige al login. Se llama al principio de
 * cada página y de cada Server Action: el proxy solo hace una redirección
 * optimista, la verificación real es esta.
 */
export const requerirInstructor = cache(async () => {
  const id = await idDeSesion();
  if (!id) redirect("/login");
  const instructor = await db.instructor.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true, activo: true },
  });
  if (!instructor || !instructor.activo) redirect("/login");
  return instructor;
});
