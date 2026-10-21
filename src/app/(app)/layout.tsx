import Link from "next/link";
import { requerirInstructor } from "@/lib/auth";
import { cerrarSesion } from "@/app/login/actions";
import { Navegacion } from "@/components/navegacion";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const instructor = await requerirInstructor();

  return (
    <>
      <header className="border-b border-borde bg-superficie">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Bitácora <span className="text-acento">CVSI</span>
          </Link>
          <Navegacion variante="superior" />
          <form action={cerrarSesion} className="flex items-center gap-3">
            <span className="hidden text-sm text-suave sm:inline">{instructor.nombre}</span>
            <button type="submit" className="text-sm font-medium text-suave underline-offset-4 hover:text-texto hover:underline">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      <Navegacion variante="barra" />
    </>
  );
}
