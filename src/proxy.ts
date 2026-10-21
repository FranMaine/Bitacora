import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESION, leerToken } from "@/lib/session";

// Redirección optimista: sin cookie de sesión válida, todo va al login. La
// verificación de verdad (instructor activo) la hace requerirInstructor() en
// cada página y acción. Toda la app es privada, no hay páginas públicas salvo /login.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const logueado = (await leerToken(request.cookies.get(COOKIE_SESION)?.value)) !== null;

  if (pathname === "/login") {
    return logueado ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!logueado) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  // Dejamos pasar sin sesión los archivos públicos y los que necesita el PWA
  // (manifest, service worker e iconos) — son archivos estáticos sin datos.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-maskable.svg|manifest.webmanifest|sw.js|robots.txt).*)",
  ],
};
