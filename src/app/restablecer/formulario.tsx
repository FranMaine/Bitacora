"use client";

import { useActionState } from "react";
import { restablecerClave, type EstadoRestablecer } from "./actions";

export function FormularioRestablecer({ token }: { token: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoRestablecer, FormData>(restablecerClave.bind(null, token), {});

  return (
    <form action={accion} className="mt-8 space-y-4">
      <div>
        <label htmlFor="nueva" className="etiqueta">Contraseña nueva (mínimo 8 caracteres)</label>
        <input id="nueva" name="nueva" type="password" autoComplete="new-password" minLength={8} required className="campo" />
      </div>
      <div>
        <label htmlFor="repetir" className="etiqueta">Repetí la contraseña</label>
        <input id="repetir" name="repetir" type="password" autoComplete="new-password" minLength={8} required className="campo" />
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-peligro">{estado.error}</p>
      )}
      <button type="submit" disabled={pendiente} className="boton boton-primario w-full">
        {pendiente ? "Guardando…" : "Guardar y entrar"}
      </button>
    </form>
  );
}
