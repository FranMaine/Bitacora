"use client";

import { useEffect } from "react";

/** Registra el service worker en segundo plano cuando el navegador lo soporta.
 *  No pinta nada; sólo habilita el "añadir a pantalla de inicio". */
export function RegistrarSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Si falla no se hace nada: la app sigue funcionando por red.
    });
  }, []);
  return null;
}
