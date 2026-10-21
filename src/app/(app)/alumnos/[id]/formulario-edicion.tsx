"use client";

import { useActionState } from "react";
import { guardarAlumno } from "../actions";
import type { EstadoForm } from "../actions";
import { MensajeForm } from "@/components/mensaje-form";

type Props = {
  alumno: { id: string; nombre: string; categoriaId: string; notas: string | null };
  categorias: { id: string; nombre: string }[];
};

export function FormularioEdicion({ alumno, categorias }: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarAlumno.bind(null, alumno.id), {});
  return (
    <form action={accion} className="caja space-y-3 p-4">
      <div>
        <label htmlFor="nombre" className="etiqueta">Nombre</label>
        <input id="nombre" name="nombre" defaultValue={alumno.nombre} required className="campo" />
      </div>
      <div>
        <label htmlFor="categoriaId" className="etiqueta">Categoría</label>
        <select id="categoriaId" name="categoriaId" defaultValue={alumno.categoriaId} className="campo">
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="notas" className="etiqueta">Notas (puntos débiles, a qué prestarle atención…)</label>
        <textarea id="notas" name="notas" rows={3} defaultValue={alumno.notas ?? ""} className="campo" />
      </div>
      <MensajeForm error={estado.error} ok={estado.ok} />
      <button type="submit" disabled={pendiente} className="boton boton-primario">{pendiente ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
