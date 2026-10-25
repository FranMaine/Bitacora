"use client";

import { useActionState } from "react";
import { registrarse, type EstadoRegistro } from "./actions";

export function FormularioRegistro({ pideCodigo }: { pideCodigo: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoRegistro, FormData>(registrarse, {});

  return (
    <form action={accion} className="mt-8 space-y-4">
      {pideCodigo && (
        <div>
          <label htmlFor="codigo" className="etiqueta">Código de invitación</label>
          <input id="codigo" name="codigo" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} required className="campo" />
        </div>
      )}
      <div>
        <label htmlFor="nombre" className="etiqueta">Nombre y apellido</label>
        <input id="nombre" name="nombre" type="text" autoComplete="name" required className="campo" />
      </div>
      <div>
        <label htmlFor="email" className="etiqueta">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <label htmlFor="password" className="etiqueta">Contraseña (mínimo 8 caracteres)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="campo" />
      </div>
      {estado.error && (
        <p role="alert" className="confirmar text-sm text-peligro">{estado.error}</p>
      )}
      <button type="submit" disabled={pendiente} className="boton boton-primario w-full">
        {pendiente ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <p className="text-xs text-suave">
        No pedimos verificación de mail: tratá la cuenta como tuya. Guardamos los datos de los chicos; no compartas tu contraseña.
      </p>
    </form>
  );
}
