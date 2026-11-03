"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Pencil, Wrench } from "lucide-react";
import { crearObservacion, guardarCosto, marcarArreglado, type EstadoGomon } from "./actions";
import { MensajeForm } from "@/components/mensaje-form";

/** Carga de una observación nueva (queda pendiente). */
export function FormularioObservacion({ embarcacionId, hoy }: { embarcacionId: string; hoy: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoGomon, FormData>(crearObservacion.bind(null, embarcacionId), {});
  const formulario = useRef<HTMLFormElement>(null);

  // Al cargar bien, el formulario queda limpio para la siguiente observación.
  useEffect(() => {
    if (estado.ok) {
      formulario.current?.reset();
      // reset() deja la fecha en la inicial; la dejamos en hoy
    }
  }, [estado]);

  return (
    <form action={accion} ref={formulario} className="caja space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Wrench size={17} aria-hidden /> Nueva observación
      </h2>
      <div>
        <label htmlFor="descripcion" className="etiqueta">¿Qué le pasa al bote?</label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={3}
          required
          maxLength={1000}
          className="campo"
          placeholder="Ej.: pierde aire el flotador de babor, el motor se ahoga al acelerar…"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="fecha" className="etiqueta">Fecha en que se vio</label>
          <input id="fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} required className="campo" />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-[12px] border border-borde bg-superficie px-3">
          <input type="checkbox" name="urgente" className="size-5 accent-[var(--acento)]" />
          <span className="text-sm">Es urgente <span className="text-suave">(no se puede salir así)</span></span>
        </label>
      </div>
      <MensajeForm error={estado.error} ok={estado.ok} />
      <button type="submit" disabled={pendiente} className="boton boton-primario w-full sm:w-auto">
        {pendiente ? "Guardando…" : "Cargar observación"}
      </button>
    </form>
  );
}

/** Botón "Marcar como arreglado" que abre un pequeño formulario: fecha del arreglo y qué se hizo. */
export function MarcarArreglado({ id, fechaObservada, hoy }: { id: string; fechaObservada: string; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState<EstadoGomon, FormData>(marcarArreglado.bind(null, id), {});

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="boton boton-primario !min-h-10 text-sm">
        <Check size={16} aria-hidden /> Marcar como arreglado
      </button>
    );
  }
  return (
    <form action={accion} className="aparecer w-full space-y-3 rounded-[12px] border border-borde bg-fondo/60 p-3">
      <div>
        <label htmlFor={`solucion-${id}`} className="etiqueta">¿Qué se hizo? (opcional)</label>
        <textarea id={`solucion-${id}`} name="solucion" rows={2} maxLength={1000} className="campo" placeholder="Ej.: se parchó el flotador y se infló a presión…" />
      </div>
      <div>
        <label htmlFor={`resuelto-${id}`} className="etiqueta">Fecha del arreglo</label>
        <input id={`resuelto-${id}`} name="resueltoEn" type="date" defaultValue={hoy} min={fechaObservada} max={hoy} required className="campo" />
      </div>
      <div>
        <label htmlFor={`costo-${id}`} className="etiqueta">Costo del arreglo en pesos (opcional)</label>
        <input id={`costo-${id}`} name="costo" inputMode="numeric" autoComplete="off" placeholder="Ej.: 25000" className="campo" />
      </div>
      <MensajeForm error={estado.error} ok={estado.ok} />
      <div className="flex gap-2">
        <button type="submit" disabled={pendiente} className="boton boton-primario !min-h-10 flex-1 text-sm">
          {pendiente ? "Guardando…" : "Confirmar"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="boton !min-h-10 text-sm">Cancelar</button>
      </div>
    </form>
  );
}

/** Cargar o corregir el costo de un arreglo ya hecho. */
export function EditarCosto({ id, costo }: { id: string; costo: number | null }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState<EstadoGomon, FormData>(guardarCosto.bind(null, id), {});

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center gap-1 text-xs font-medium text-suave underline-offset-4 hover:text-texto hover:underline">
        <Pencil size={13} aria-hidden /> {costo === null ? "Cargar costo" : "Cambiar costo"}
      </button>
    );
  }
  return (
    <form action={accion} className="aparecer flex w-full flex-wrap items-center gap-2">
      <label htmlFor={`editar-costo-${id}`} className="sr-only">Costo en pesos</label>
      <input id={`editar-costo-${id}`} name="costo" inputMode="numeric" autoComplete="off" defaultValue={costo ?? ""} placeholder="Pesos" className="campo !min-h-10 min-w-0 flex-1" />
      <button type="submit" disabled={pendiente} className="boton boton-primario !min-h-10 text-sm">{pendiente ? "…" : "Guardar"}</button>
      <button type="button" onClick={() => setAbierto(false)} className="boton !min-h-10 text-sm">Cerrar</button>
      <MensajeForm error={estado.error} ok={estado.ok} />
    </form>
  );
}
