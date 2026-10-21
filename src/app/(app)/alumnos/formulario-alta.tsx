"use client";

import { useActionState, useEffect, useRef } from "react";
import { agregarAlumnos, type EstadoForm } from "./actions";
import { MensajeForm } from "@/components/mensaje-form";

export function FormularioAlta({ categorias }: { categorias: { id: string; nombre: string }[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(agregarAlumnos, {});
  const nombres = useRef<HTMLTextAreaElement>(null);

  // Al agregar bien, se vacía la lista de nombres para cargar otro grupo.
  useEffect(() => {
    if (estado.ok && nombres.current) nombres.current.value = "";
  }, [estado]);

  return (
    <form action={accion} className="caja space-y-3 p-4">
      <h2 className="font-semibold">Agregar alumnos</h2>
      <div>
        <label htmlFor="categoriaId" className="etiqueta">Categoría</label>
        <select id="categoriaId" name="categoriaId" required className="campo" defaultValue="">
          <option value="" disabled>Elegí una…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="nombres" className="etiqueta">Nombres (uno por línea)</label>
        <textarea id="nombres" name="nombres" ref={nombres} rows={4} required className="campo" placeholder={"Juan Pérez\nMartina Gómez"} />
      </div>
      <MensajeForm error={estado.error} ok={estado.ok} />
      <button type="submit" disabled={pendiente} className="boton boton-primario w-full sm:w-auto">
        {pendiente ? "Agregando…" : "Agregar"}
      </button>
    </form>
  );
}
