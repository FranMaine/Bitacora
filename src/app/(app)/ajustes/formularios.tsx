"use client";

import { useActionState, useEffect, useRef } from "react";
import { agregarItem, agregarInstructor, cambiarMiClave, type EstadoAjustes, type TipoCatalogo } from "./actions";
import { MensajeForm } from "@/components/mensaje-form";

/** Limpia el formulario cuando la acción terminó bien. */
function useLimpiar(estado: EstadoAjustes) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);
  return ref;
}

export function FormularioAgregarItem({ tipo, placeholder }: { tipo: TipoCatalogo; placeholder: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAjustes, FormData>(agregarItem.bind(null, tipo), {});
  const ref = useLimpiar(estado);
  return (
    <form action={accion} ref={ref} className="space-y-2">
      <div className="flex gap-2">
        <input name="nombre" required placeholder={placeholder} aria-label="Nombre" className="campo" />
        <button type="submit" disabled={pendiente} className="boton boton-primario shrink-0">Agregar</button>
      </div>
      <MensajeForm error={estado.error} ok={estado.ok} />
    </form>
  );
}

export function FormularioInstructor() {
  const [estado, accion, pendiente] = useActionState<EstadoAjustes, FormData>(agregarInstructor, {});
  const ref = useLimpiar(estado);
  return (
    <form action={accion} ref={ref} className="space-y-3">
      <div>
        <label htmlFor="i-nombre" className="etiqueta">Nombre</label>
        <input id="i-nombre" name="nombre" required className="campo" />
      </div>
      <div>
        <label htmlFor="i-email" className="etiqueta">Email</label>
        <input id="i-email" name="email" type="email" required autoComplete="off" className="campo" />
      </div>
      <div>
        <label htmlFor="i-clave" className="etiqueta">Contraseña inicial (mínimo 8 caracteres)</label>
        <input id="i-clave" name="password" type="password" required minLength={8} autoComplete="new-password" className="campo" />
      </div>
      <MensajeForm error={estado.error} ok={estado.ok} />
      <button type="submit" disabled={pendiente} className="boton boton-primario">Agregar instructor</button>
    </form>
  );
}

export function FormularioClave() {
  const [estado, accion, pendiente] = useActionState<EstadoAjustes, FormData>(cambiarMiClave, {});
  const ref = useLimpiar(estado);
  return (
    <form action={accion} ref={ref} className="space-y-3">
      <div>
        <label htmlFor="c-actual" className="etiqueta">Contraseña actual</label>
        <input id="c-actual" name="actual" type="password" required autoComplete="current-password" className="campo" />
      </div>
      <div>
        <label htmlFor="c-nueva" className="etiqueta">Contraseña nueva (mínimo 8 caracteres)</label>
        <input id="c-nueva" name="nueva" type="password" required minLength={8} autoComplete="new-password" className="campo" />
      </div>
      <MensajeForm error={estado.error} ok={estado.ok} />
      <button type="submit" disabled={pendiente} className="boton">Cambiar contraseña</button>
    </form>
  );
}
