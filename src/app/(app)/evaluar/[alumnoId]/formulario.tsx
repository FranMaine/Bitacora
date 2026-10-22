"use client";

import { useActionState } from "react";
import { guardarEvaluacion, type EstadoEvaluacion } from "./actions";

type Criterio = { id: string; nombre: string; valor: number | null; anterior: number | null };

export function FormularioEvaluacion({
  alumnoId,
  evaluacionId,
  fecha,
  hoy,
  criterios,
  comentario,
}: {
  alumnoId: string;
  evaluacionId: string | null;
  fecha: string;
  hoy: string;
  criterios: Criterio[];
  comentario: string;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoEvaluacion, FormData>(
    guardarEvaluacion.bind(null, alumnoId, evaluacionId),
    {},
  );

  return (
    <form action={accion} className="space-y-5">
      <div className="caja p-4">
        <label htmlFor="fecha" className="etiqueta">Fecha de la evaluación</label>
        <input id="fecha" name="fecha" type="date" defaultValue={fecha} max={hoy} required className="campo sm:max-w-56" />
      </div>

      {criterios.map((c) => (
        <fieldset key={c.id} className="caja p-4">
          <legend className="sr-only">{c.nombre}</legend>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="font-semibold">{c.nombre}</p>
            {c.anterior !== null && <p className="text-xs text-suave">Última vez: {c.anterior}</p>}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name={`nota_${c.id}`} value={n} defaultChecked={c.valor === n} className="peer sr-only" />
                <span className="flex h-11 items-center justify-center rounded-[12px] border border-borde bg-superficie font-medium transition-[background-color,border-color,transform] duration-[120ms] active:scale-95 peer-checked:border-acento peer-checked:bg-acento peer-checked:text-[#fff] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento dark:peer-checked:text-[#06202e]">
                  {n}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="caja p-4">
        <label htmlFor="comentario" className="etiqueta">Comentario (opcional)</label>
        <textarea id="comentario" name="comentario" rows={3} defaultValue={comentario} className="campo" placeholder="Qué mejoró, en qué trabajar…" />
      </div>

      {estado.error && <p role="alert" className="confirmar text-sm text-peligro">{estado.error}</p>}
      <button type="submit" disabled={pendiente} className="boton boton-primario w-full">
        {pendiente ? "Guardando…" : evaluacionId ? "Guardar cambios" : "Guardar evaluación"}
      </button>
    </form>
  );
}
