import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRegistro } from "./formulario";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-acento">CVSI</p>
        <h1 className="display mt-1 text-4xl">Crear cuenta</h1>
        <p className="mt-2 text-suave">
          Para instructores del club. ¿Ya tenés una?{" "}
          <Link href="/login" className="font-medium text-acento underline underline-offset-4">
            Ingresá acá
          </Link>
          .
        </p>
        <FormularioRegistro />
      </div>
    </main>
  );
}
