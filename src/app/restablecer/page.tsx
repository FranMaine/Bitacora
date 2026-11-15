import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/reseteo";
import { FormularioRestablecer } from "./formulario";
import { BotonTema } from "@/components/boton-tema";

export const metadata: Metadata = { title: "Contraseña nueva", referrer: "no-referrer" };

export default async function PaginaRestablecer({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t.slice(0, 200) : "";
  const registro = token
    ? await db.reseteoClave.findUnique({ where: { tokenHash: hashToken(token) }, select: { usadoEn: true, expiraEn: true } })
    : null;
  const valido = Boolean(registro && !registro.usadoEn && registro.expiraEn > new Date());

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))]">
        <BotonTema />
      </div>
      <div className="w-full max-w-sm">
        <Image src="/cvsi.webp" alt="CVSI" width={400} height={207} className="h-14 w-auto" priority />
        <h1 className="display mt-4 text-4xl">Contraseña nueva</h1>
        {valido ? (
          <>
            <p className="mt-2 text-suave">Elegí la contraseña con la que vas a entrar a Bitácora.</p>
            <FormularioRestablecer token={token} />
          </>
        ) : (
          <>
            <p role="alert" className="mt-4 text-peligro">El link venció o ya se usó.</p>
            <p className="mt-2 text-suave">Los links sirven una sola vez y duran una hora. Pedí uno nuevo.</p>
            <Link href="/recuperar" className="boton boton-primario mt-6 w-full">
              Pedir un link nuevo
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
