import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { RegistrarSW } from "@/components/registrar-sw";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Bitácora", template: "%s · Bitácora" },
  description: "Bitácora de entrenamientos del CVSI, solo para instructores.",
  robots: { index: false, follow: false },
  // Ícono para el navegador y para "Añadir a pantalla de inicio" en iOS/Android.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  // En iOS, cuando el usuario agrega la app a pantalla de inicio, estos ajustes
  // la abren sin barras del navegador y con el estilo oscuro de la barra de estado.
  appleWebApp: {
    capable: true,
    title: "Bitácora",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1114" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
