import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import { RegistrarSW } from "@/components/registrar-sw";

// Geist para texto; Playfair Display sólo para los H1 principales (`.display`).
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Bitácora", template: "%s · Bitácora" },
  description: "Bitácora de entrenamientos del CVSI, solo para instructores.",
  robots: { index: false, follow: false },
  // Ícono para el navegador y para "Añadir a pantalla de inicio" en iOS/Android.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  // iOS: al agregar a pantalla de inicio se abre sin barras y con la barra de estado oscura.
  appleWebApp: {
    capable: true,
    title: "Bitácora",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Con la app instalada, el contenido llega hasta el borde (muesca, barra inferior): se compensa con env(safe-area-inset-*).
  viewportFit: "cover",
  // En Android el teclado achica el área visible, así los botones fijos no quedan tapados.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1013" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${geist.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
