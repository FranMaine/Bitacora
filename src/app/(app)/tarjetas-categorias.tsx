"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatoDuracion } from "@/lib/calculos";

export type Estado = "realizado" | "planificado" | "sin_cargar";
export type TarjetaCategoria = {
  id: string;
  nombre: string;
  total: number;
  presentes: number;
  minutos: number | null;
  estado: Estado;
  temas: string[];
};

const CHIP: Record<Estado, { texto: string; clase: string }> = {
  realizado: { texto: "Realizado", clase: "chip-ok" },
  planificado: { texto: "Planificado", clase: "chip-alerta" },
  sin_cargar: { texto: "Sin cargar", clase: "chip-neutro" },
};

/** Las categorías vacías y sin plan se esconden detrás de un expandible, para
 *  que el día a día no se llene de filas que no se van a usar. */
export function TarjetasCategorias({ fecha, categorias }: { fecha: string; categorias: TarjetaCategoria[] }) {
  const [verVacias, setVerVacias] = useState(false);
  const relevantes = categorias.filter((c) => c.total > 0 || c.estado !== "sin_cargar");
  const vacias = categorias.filter((c) => c.total === 0 && c.estado === "sin_cargar");

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {relevantes.map((c) => (
          <Tarjeta key={c.id} fecha={fecha} categoria={c} />
        ))}
      </ul>
      {vacias.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setVerVacias((v) => !v)}
            className="text-sm text-suave underline-offset-4 hover:text-texto hover:underline"
          >
            {verVacias ? "Ocultar categorías sin alumnos" : `Mostrar ${vacias.length} categoría${vacias.length === 1 ? "" : "s"} sin alumnos`}
          </button>
          {verVacias && (
            <ul className="mt-3 space-y-3">
              {vacias.map((c) => (
                <Tarjeta key={c.id} fecha={fecha} categoria={c} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Tarjeta({ fecha, categoria: c }: { fecha: string; categoria: TarjetaCategoria }) {
  const chip = CHIP[c.estado];
  return (
    <li>
      <Link
        href={`/entrenamiento/${fecha}/${c.id}`}
        className="caja caja-link flex items-center justify-between gap-3 p-4"
      >
        <div className="min-w-0">
          <p className="font-semibold">{c.nombre}</p>
          <p className="mt-0.5 text-sm text-suave">
            {c.total} {c.total === 1 ? "alumno" : "alumnos"}
            {c.estado === "realizado" && ` · ${c.presentes} presentes`}
            {c.minutos !== null && ` · ${formatoDuracion(c.minutos)} en el agua`}
          </p>
          {c.temas.length > 0 && <p className="mt-1 truncate text-sm text-suave">{c.temas.join(", ")}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`chip ${chip.clase}`}>{chip.texto}</span>
          <ChevronRight size={18} className="text-suave" aria-hidden />
        </div>
      </Link>
    </li>
  );
}
