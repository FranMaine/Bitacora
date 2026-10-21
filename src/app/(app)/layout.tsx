import Link from "next/link";
import Image from "next/image";
import { requerirInstructor } from "@/lib/auth";
import { cerrarSesion } from "@/app/login/actions";
import { Navegacion } from "@/components/navegacion";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const instructor = await requerirInstructor();
  // En celular dejamos solo iniciales + "Salir" para no comerle 1/3 del ancho a la cabecera.
  const inicialesInstructor = instructor.nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-borde bg-superficie/90 backdrop-blur-md supports-[backdrop-filter]:bg-superficie/75">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
            <Image src="/cvsi.webp" alt="CVSI" width={400} height={207} className="h-7 w-auto" priority />
            Bitácora
          </Link>
          <Navegacion variante="superior" />
          <form action={cerrarSesion} className="flex items-center gap-2">
            <span className="hidden text-sm text-suave sm:inline">{instructor.nombre}</span>
            <span
              className="flex size-8 items-center justify-center rounded-full bg-acento-suave text-xs font-semibold text-acento sm:hidden"
              aria-label={instructor.nombre}
              title={instructor.nombre}
            >
              {inicialesInstructor}
            </span>
            <button type="submit" className="text-sm font-medium text-suave underline-offset-4 hover:text-texto hover:underline">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <Navegacion variante="barra" />
    </>
  );
}
