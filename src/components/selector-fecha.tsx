"use client";

import { useRouter } from "next/navigation";

/** Calendario nativo: al elegir un día navega a /?fecha=… */
export function SelectorFecha({ fecha }: { fecha: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      aria-label="Elegir día"
      value={fecha}
      onChange={(e) => e.target.value && router.push(`/jornada?fecha=${e.target.value}`)}
      className="campo !w-0 min-w-0 flex-1 sm:!w-auto sm:flex-none"
    />
  );
}
