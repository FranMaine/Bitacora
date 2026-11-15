import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { FormularioRecuperar } from "./formulario";
import { BotonTema } from "@/components/boton-tema";
import { mailConfigurado } from "@/lib/mail";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperar() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))]">
        <BotonTema />
      </div>
      <div className="w-full max-w-sm">
        <Image src="/cvsi.webp" alt="CVSI" width={400} height={207} className="h-14 w-auto" priority />
        <h1 className="display mt-4 text-4xl">Recuperar contraseña</h1>
        {mailConfigurado() ? (
          <>
            <p className="mt-2 text-suave">Escribí tu email y te mandamos un link para elegir una contraseña nueva.</p>
            <FormularioRecuperar />
          </>
        ) : (
          <p className="mt-4 text-suave">La recuperación por mail todavía no está habilitada. Consultá con quien administra la app.</p>
        )}
        <p className="mt-6 text-sm text-suave">
          <Link href="/login" className="font-medium text-acento underline underline-offset-4">
            Volver al login
          </Link>
        </p>
      </div>
    </main>
  );
}
