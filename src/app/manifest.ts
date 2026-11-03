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
    // Android arma la pantalla de carga con este fondo, el ícono de 512 y el nombre de la app.
    background_color: "#f6f7f8",
    theme_color: "#0b5f8f",
    lang: "es-AR",
    // El escudo del club (se regeneran con scripts/generar-iconos.py).
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
