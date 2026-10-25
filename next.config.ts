import type { NextConfig } from "next";

// App 100% privada y siempre dinámica (cada página depende de la sesión), así que
// no se usa cacheComponents/partialPrefetching: complicarían todo sin ganar nada.
// Content-Security-Policy: solo contenido propio. Next hidrata con scripts inline, por eso 'unsafe-inline'
// en script-src (sin nonce, que obligaría a renderizar todo dinámico). En desarrollo el HMR necesita eval y
// websockets, por eso solo se aplica en producción.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: CSP }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
