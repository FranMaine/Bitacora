import type { MetadataRoute } from "next";

// Convierte la web en una app instalable en el celular: desde el navegador,
// "Añadir a pantalla de inicio" la deja como ícono propio y la abre a pantalla
// completa (sin barras del navegador). Es solo metadata — no cambia nada de
// cómo funciona.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bitácora CVSI",
    short_name: "Bitácora",
    description: "Entrenamientos, asistencia y evaluaciones del CVSI",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1114",
    theme_color: "#0b5f8f",
    lang: "es-AR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
