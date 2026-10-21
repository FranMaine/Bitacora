import type { Metadata } from "next";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Ingresar" };

export default function PaginaLogin() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-acento">CVSI</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Bitácora</h1>
        <p className="mt-2 text-suave">Entrenamientos, asistencia y evaluaciones. Solo para instructores.</p>
        <FormularioLogin />
      </div>
    </main>
  );
}
