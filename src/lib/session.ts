import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Sesión propia: un JWT firmado (HS256) en una cookie HttpOnly. Solo guarda el
// id del instructor; los datos y si sigue activo se leen de la base en cada página.
export const COOKIE_SESION = "bitacora_sesion";
const DURACION_DIAS = 30;

function clave(): Uint8Array {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < 32) throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres)");
  return new TextEncoder().encode(secreto);
}

export async function firmarToken(instructorId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(instructorId)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_DIAS}d`)
    .sign(clave());
}

/** Id del instructor si el token es válido y no venció; null si no. */
export async function leerToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function crearSesion(instructorId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_SESION, await firmarToken(instructorId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_DIAS * 24 * 60 * 60,
  });
}

export async function borrarSesion(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_SESION);
}

export async function idDeSesion(): Promise<string | null> {
  const jar = await cookies();
  return leerToken(jar.get(COOKIE_SESION)?.value);
}
