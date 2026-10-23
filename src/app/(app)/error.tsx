"use client";

import Link from "next/link";

// Si una pantalla falla (por ejemplo, se cortó la conexión), en vez de la pantalla
// de error genérica se muestra esto, con la opción de reintentar.
export default function ErrorPantalla({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="caja mx-auto max-w-md space-y-3 p-6 text-center">
      <h1 className="display text-2xl">No se pudo cargar</h1>
      <p className="text-suave">
        Puede ser un problema de conexión. Tus datos están a salvo: probá de nuevo en unos segundos.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={reset} className="boton boton-primario">Reintentar</button>
        <Link href="/estadisticas" className="boton">Ir al inicio</Link>
      </div>
    </div>
  );
}
