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

// Pantallas de carga de iOS: una imagen por tamaño de iPhone (la app instalada muestra el escudo y el nombre).
// [ancho px, alto px, ancho pt, alto pt, factor de pixel]
const PANTALLAS: [number, number, number, number, number][] = [
  [1320, 2868, 440, 956, 3],
  [1206, 2622, 402, 874, 3],
  [1290, 2796, 430, 932, 3],
  [1179, 2556, 393, 852, 3],
  [1284, 2778, 428, 926, 3],
  [1170, 2532, 390, 844, 3],
  [1125, 2436, 375, 812, 3],
  [1242, 2688, 414, 896, 3],
  [828, 1792, 414, 896, 2],
  [1242, 2208, 414, 736, 3],
  [750, 1334, 375, 667, 2],
  [640, 1136, 320, 568, 2],
];
const imagenesDeCarga = PANTALLAS.flatMap(([w, h, pw, ph, f]) => {
  const base = `(device-width: ${pw}px) and (device-height: ${ph}px) and (-webkit-device-pixel-ratio: ${f}) and (orientation: portrait)`;
  return [
    { url: `/icons/splash-${w}x${h}.png`, media: `${base} and (prefers-color-scheme: light)` },
    { url: `/icons/splash-${w}x${h}-oscuro.png`, media: `${base} and (prefers-color-scheme: dark)` },
  ];
});

export const metadata: Metadata = {
  title: { default: "Bitácora", template: "%s · Bitácora" },
  description: "Bitácora de entrenamientos del CVSI, solo para instructores.",
  robots: { index: false, follow: false },
  // Ícono para el navegador y para "Añadir a pantalla de inicio" en iOS/Android.
  icons: {
    icon: [{ url: "/icons/favicon.png", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS: al agregar a pantalla de inicio se abre sin barras y con la barra de estado oscura.
  appleWebApp: {
    capable: true,
    title: "Bitácora",
    statusBarStyle: "black-translucent",
    startupImage: imagenesDeCarga,
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

const SCRIPT_TEMA = `(function(){try{var s=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var t=s;try{var r=JSON.parse(localStorage.getItem("tema2")||"null");if(r&&(r.t==="light"||r.t==="dark")&&r.s===s)t=r.t;else if(r)localStorage.removeItem("tema2")}catch(e){}document.documentElement.setAttribute("data-theme",t);var c=t==="dark"?"#0b1013":"#f6f7f8";document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${geist.variable} ${playfair.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Antes de pintar: tema elegido con el botón sol/luna o, si no hay, el del sistema (sin parpadeo). */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
