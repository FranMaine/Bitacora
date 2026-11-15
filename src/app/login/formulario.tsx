"use client";

import Link from "next/link";
import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";

export function FormularioLogin({ conRecuperar }: { conRecuperar: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});

  return (
    <form action={accion} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="etiqueta">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="campo" />
      </div>
      <div>
        <label htmlFor="password" className="etiqueta">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="campo" />
      </div>
      {estado.error && (
        <p role="alert" className="text-sm text-peligro">{estado.error}</p>
      )}
      <button type="submit" disabled={pendiente} className="boton boton-primario w-full">
        {pendiente ? "Ingresando…" : "Ingresar"}
      </button>
      {conRecuperar && (
        <p className="text-center text-sm">
          <Link href="/recuperar" className="font-medium text-acento underline underline-offset-4">
            Olvidé mi contraseña
          </Link>
        </p>
      )}
    </form>
  );
}
