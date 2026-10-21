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
      onChange={(e) => e.target.value && router.push(`/?fecha=${e.target.value}`)}
      className="campo !w-auto"
    />
  );
}
