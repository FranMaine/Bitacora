"use client";

import { useActionState } from "react";
import { pedirReseteo, type EstadoRecuperar } from "./actions";
import { MensajeForm } from "@/components/mensaje-form";

export function FormularioRecuperar() {
  const [estado, accion, pendiente] = useActionState<EstadoRecuperar, FormData>(pedirReseteo, {});

  return (
    <form action={accion} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="etiqueta">Email con el que te registraste</label>
        <input id="email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" required className="campo" />
      </div>
      <MensajeForm error={estado.error} ok={estado.ok} />
      <button type="submit" disabled={pendiente} className="boton boton-primario w-full">
        {pendiente ? "Enviando…" : "Enviarme el link"}
      </button>
    </form>
  );
}
