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
  // Arranca en la primera categoría con alumnos; "todas" muestra todo junto.
  const [elegida, setElegida] = useState<string>(() => grupos.find((g) => g.alumnos.length > 0)?.id ?? "todas");

  const buscando = consulta.trim() !== "";
  const filtrados = useMemo(() => {
    const q = normalizar(consulta.trim());
    // Al buscar se mira en todas las categorías; sin búsqueda, solo la elegida.
    const base = q || elegida === "todas" ? grupos : grupos.filter((g) => g.id === elegida);
    if (!q) return base;
    return base
      .map((g) => ({ ...g, alumnos: g.alumnos.filter((a) => normalizar(a.nombre).includes(q)) }))
      .filter((g) => g.alumnos.length > 0);
  }, [consulta, grupos, elegida]);

  const total = grupos.reduce((s, g) => s + g.alumnos.length, 0);

  return (
    <div className="space-y-5">
      <label className="relative block">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
        <input
          type="search"
          enterKeyHint="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder={`Buscar entre ${total} alumnos…`}
          aria-label="Buscar alumnos"
          className="campo pl-10"
        />
      </label>

      <div role="group" aria-label="Categoría" className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setElegida("todas")} aria-pressed={!buscando && elegida === "todas"} className="filtro">
          Todas <span className="text-xs font-normal opacity-80">{total}</span>
        </button>
        {grupos.map((g) => (
          <button key={g.id} type="button" onClick={() => setElegida(g.id)} aria-pressed={!buscando && elegida === g.id} className="filtro">
            {g.nombre} <span className="text-xs font-normal opacity-80">{g.alumnos.length}</span>
          </button>
        ))}
      </div>
      {buscando && <p className="-mt-2 text-xs text-suave">Buscando en todas las categorías.</p>}

      {filtrados.length === 0 ? (
        <p className="caja p-4 text-sm text-suave">
          {buscando ? `Sin resultados para “${consulta}”.` : "Esta categoría todavía no tiene alumnos."}
        </p>
      ) : (
        filtrados.map((g) => (
          <section key={g.id}>
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-acento-suave text-acento" aria-hidden>
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
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{a.nombre}</span>
                    {a.faltasSeguidas >= 3 && (
                      <span className="chip chip-alerta shrink-0" title="Faltas seguidas">
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
