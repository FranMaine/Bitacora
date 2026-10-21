// Logo (silueta en SVG) para cada clase/categoría. Como las categorías son
// editables desde Ajustes, el nombre puede llegar escrito de cualquier forma —
// buscamos palabras clave en el nombre normalizado y caemos a un velero
// genérico si no reconocemos ninguna.

type Props = { nombre: string; tam?: number; className?: string };

type Variante = "optimist-chico" | "optimist" | "ilca" | "420" | "29er" | "snipe" | "f18" | "velero";

function identificar(nombre: string): Variante {
  const n = nombre
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (/principi/.test(n) && /opt/.test(n)) return "optimist-chico";
  if (/opt/.test(n)) return "optimist";
  if (/\b29/.test(n)) return "29er";
  if (/\b420\b/.test(n)) return "420";
  if (/ilca|laser/.test(n)) return "ilca";
  if (/snipe/.test(n)) return "snipe";
  if (/f18|catamar/.test(n)) return "f18";
  return "velero";
}

/* Las siluetas comparten el mismo viewBox 64×48 y la misma línea de flotación
   (y=38): colocadas una al lado de la otra las clases "pesan" distinto, pero
   sin romper la cuadrícula visual. Trazo con currentColor para que hereden el
   color del contenedor. */
export function LogoClase({ nombre, tam = 36, className }: Props) {
  const v = identificar(nombre);
  const comun = {
    width: tam,
    height: Math.round((tam * 48) / 64),
    viewBox: "0 0 64 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  return (
    <svg {...comun} className={className}>
      {/* Línea de agua, pequeñas ondas */}
      <path d="M4 42 Q 14 40 24 42 T 44 42 T 60 42" opacity="0.5" />
      {dibujo(v)}
    </svg>
  );
}

function dibujo(v: Variante) {
  switch (v) {
    case "optimist-chico":
      // Optimist (vela cuadrada, botecito rectangular). Variante "chico":
      // relleno hueco, para distinguirla de la de timoneles.
      return (
        <g>
          <path d="M32 10 L32 32 L18 32 Z" />
          <line x1="32" y1="10" x2="32" y2="32" />
          <path d="M14 34 L50 34 L46 38 L18 38 Z" />
        </g>
      );
    case "optimist":
      return (
        <g>
          <path d="M32 10 L32 32 L18 32 Z" fill="currentColor" opacity="0.75" />
          <path d="M14 34 L50 34 L46 38 L18 38 Z" fill="currentColor" opacity="0.9" />
        </g>
      );
    case "ilca":
      // Vela triangular alta, casco esbelto (bote individual).
      return (
        <g>
          <path d="M34 6 L34 34 L22 34 Z" fill="currentColor" opacity="0.75" />
          <path d="M34 10 L34 34 L42 34 Z" opacity="0.6" />
          <path d="M12 36 L52 36 L46 40 L18 40 Z" fill="currentColor" opacity="0.9" />
        </g>
      );
    case "420":
      // Vela mayor + foque + spinnaker insinuado (silueta reconocible del 420).
      return (
        <g>
          <path d="M30 6 L30 34 L18 34 Z" fill="currentColor" opacity="0.75" />
          <path d="M32 14 L32 34 L46 34 Z" opacity="0.65" />
          <path d="M12 36 L54 36 L48 40 L16 40 Z" fill="currentColor" opacity="0.9" />
        </g>
      );
    case "29er":
      // Skiff: vela alta y angulosa, bote largo plano.
      return (
        <g>
          <path d="M28 4 L34 34 L18 34 Z" fill="currentColor" opacity="0.8" />
          <path d="M34 14 L36 34 L50 34 Z" opacity="0.65" />
          <path d="M8 36 L56 36 L50 40 L14 40 Z" fill="currentColor" opacity="0.9" />
        </g>
      );
    case "snipe":
      // Dos velas chicas, casco achatado.
      return (
        <g>
          <path d="M28 12 L28 34 L18 34 Z" fill="currentColor" opacity="0.7" />
          <path d="M30 16 L30 34 L42 34 Z" opacity="0.55" />
          <path d="M12 36 L52 36 L46 40 L18 40 Z" fill="currentColor" opacity="0.9" />
        </g>
      );
    case "f18":
      // Catamarán: dos cascos, vela grande entre medio.
      return (
        <g>
          <path d="M32 8 L32 32 L20 32 Z" fill="currentColor" opacity="0.75" />
          <rect x="8" y="34" width="20" height="4" rx="2" fill="currentColor" opacity="0.9" />
          <rect x="36" y="34" width="20" height="4" rx="2" fill="currentColor" opacity="0.9" />
          <line x1="18" y1="32" x2="46" y2="32" opacity="0.5" />
        </g>
      );
    case "velero":
    default:
      // Fallback genérico (velero clásico).
      return (
        <g>
          <path d="M32 8 L32 34 L18 34 Z" fill="currentColor" opacity="0.75" />
          <path d="M14 36 L50 36 L46 40 L18 40 Z" fill="currentColor" opacity="0.9" />
        </g>
      );
  }
}
