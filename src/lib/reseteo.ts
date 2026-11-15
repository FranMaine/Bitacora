import { createHash, randomBytes } from "node:crypto";

// Recuperación de contraseña por mail: el link lleva un código al azar de un solo uso.
// En la base solo se guarda su hash (sha256), así que ni mirando la base se puede armar un link válido.

export const VIGENCIA_MINUTOS = 60;
/** Cuántos pedidos por hora se aceptan por instructor (evita llenar de mails a alguien). */
export const MAXIMO_PEDIDOS_POR_HORA = 3;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Código nuevo: `token` va en el link del mail, `hash` es lo único que se guarda. */
export function nuevoToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export const vencimiento = (ahora: Date = new Date()) => new Date(ahora.getTime() + VIGENCIA_MINUTOS * 60_000);

/** URL pública de la app (nunca se arma desde el pedido: un Host falso podría desviar el link del mail). */
export function urlDeLaApp(): string {
  const configurada = process.env.APP_URL?.replace(/\/+$/, "");
  if (configurada) return configurada;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export function enlaceDeReseteo(token: string): string {
  return `${urlDeLaApp()}/restablecer?t=${encodeURIComponent(token)}`;
}
