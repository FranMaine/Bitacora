"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { LogoClase } from "@/components/logo-clase";

export type Fila = { id: string; nombre: string; faltasSeguidas: number };
export type Grupo = { id: string; nombre: string; alumnos: Fila[] };

/** Pasa un acento (á, é, …) a su equivalente sin tilde. */
function normalizar(texto: string): string {
  return texto.toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function ListaAlumnos({ grupos }: { grupos: Grupo[] }) {
  const [consulta, setConsulta] = useState("");

  const filtrados = useMemo(() => {
    const q = normalizar(consulta.trim());
    if (!q) return grupos;
    return grupos
      .map((g) => ({ ...g, alumnos: g.alumnos.filter((a) => normalizar(a.nombre).includes(q)) }))
      .filter((g) => g.alumnos.length > 0);
  }, [consulta, grupos]);

  const total = grupos.reduce((s, g) => s + g.alumnos.length, 0);

  return (
    <div className="space-y-5">
      <label className="relative block">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
        <input
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder={`Buscar entre ${total} alumnos…`}
          aria-label="Buscar alumnos"
          className="campo pl-10"
        />
      </label>

      {filtrados.length === 0 ? (
        <p className="caja p-4 text-sm text-suave">Sin resultados para “{consulta}”.</p>
      ) : (
        filtrados.map((g) => (
          <section key={g.id}>
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <span className="flex size-7 items-center justify-center rounded-md bg-acento-suave text-acento" aria-hidden>
                <LogoClase nombre={g.nombre} tam={20} />
              </span>
              {g.nombre} <span className="text-sm font-normal text-suave">{g.alumnos.length}</span>
            </h2>
            <ul className="caja divide-y divide-borde">
              {g.alumnos.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/alumnos/${a.id}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-acento-suave"
                  >
                    <Avatar nombre={a.nombre} tam={36} />
                    <span className="min-w-0 flex-1 truncate">{a.nombre}</span>
                    {a.faltasSeguidas >= 3 && (
                      <span className="chip chip-alerta" title="Faltas seguidas">
                        {a.faltasSeguidas} faltas
                      </span>
                    )}
                    <ChevronRight size={18} className="shrink-0 text-suave" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
