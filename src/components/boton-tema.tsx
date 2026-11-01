"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Tema = "light" | "dark";
const COLOR_BARRA: Record<Tema, string> = { light: "#f6f7f8", dark: "#0b1013" };

/** Aplica el tema al <html> y a la barra de estado del navegador (theme-color). */
function aplicar(t: Tema) {
  document.documentElement.setAttribute("data-theme", t);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", COLOR_BARRA[t]));
}

function elegidoPorElUsuario(): Tema | null {
  try {
    const t = localStorage.getItem("tema");
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

// El tema vive en el atributo data-theme del <html> (lo pone un script antes de pintar, ver layout.tsx):
// este botón solo lo lee, lo cambia y se entera si cambia por otro lado.
function suscribir(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observador.disconnect();
}
const leer = (): Tema | null => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : null);

/** Sol / luna: sigue el tema del sistema hasta que la persona elige uno con este botón. */
export function BotonTema({ className = "" }: { className?: string }) {
  const tema = useSyncExternalStore(suscribir, leer, () => null);

  // Mientras la persona no eligió, si el sistema cambia de tema (por ejemplo, de día a noche), la app lo acompaña.
  useEffect(() => {
    const consulta = matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = () => {
      if (!elegidoPorElUsuario()) aplicar(consulta.matches ? "dark" : "light");
    };
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  const oscuro = tema === "dark";
  return (
    <button
      type="button"
      onClick={() => {
        const nuevo: Tema = oscuro ? "light" : "dark";
        try {
          localStorage.setItem("tema", nuevo);
        } catch {
          /* sin almacenamiento: el cambio vale solo hasta recargar */
        }
        aplicar(nuevo);
      }}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
      className={`boton-tema relative flex size-9 items-center justify-center rounded-full text-suave transition-colors duration-[160ms] hover:text-texto ${className}`}
    >
      <Moon size={19} strokeWidth={1.75} aria-hidden className="icono-luna absolute" />
      <Sun size={19} strokeWidth={1.75} aria-hidden className="icono-sol absolute" />
    </button>
  );
}
