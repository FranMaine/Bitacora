import type { Metadata } from "next";
import Link from "next/link";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Ingresar" };

export default function PaginaLogin() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-acento">CVSI</p>
        <h1 className="display mt-1 text-4xl">Bitácora</h1>
        <p className="mt-2 text-suave">Entrenamientos, asistencia y evaluaciones. Solo para instructores.</p>
        <FormularioLogin />
        <p className="mt-6 text-sm text-suave">
          ¿Primera vez?{" "}
          <Link href="/registro" className="font-medium text-acento underline underline-offset-4">
            Crear cuenta
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
