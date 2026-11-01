import { formatoNota } from "@/lib/calculos";

type Punto = { etiqueta: string; valor: number };

type Props = {
  puntos: Punto[];
  titulo: string;
  /** escala del eje vertical; por defecto las notas, de 1 a 10 */
  min?: number;
  max?: number;
  marcas?: number[];
  /** "%" para porcentajes: se escribe pegado al valor (72%) */
  sufijo?: string;
};

// Medidas del dibujo (en unidades del viewBox). El ancho crece con la cantidad de puntos para que cada
// etiqueta tenga siempre el mismo lugar, y el gráfico no se estira más allá de un máximo razonable:
// así las letras mantienen un tamaño legible en celular y en pantallas grandes.
const SEPARACION = 46;
const ALTO = 150;
const MARGEN = { izq: 34, der: 18, arr: 22, aba: 28 };

/** Línea simple (por defecto, de notas 1–10) con SVG puro: sin librerías. */
export function GraficoLinea({ puntos, titulo, min = 1, max = 10, marcas = [1, 5, 10], sufijo = "" }: Props) {
  const ancho = Math.max(300, MARGEN.izq + MARGEN.der + Math.max(puntos.length - 1, 1) * SEPARACION);
  const w = ancho - MARGEN.izq - MARGEN.der;
  const h = ALTO - MARGEN.arr - MARGEN.aba;
  const x = (i: number) => MARGEN.izq + (puntos.length === 1 ? w / 2 : (i / (puntos.length - 1)) * w);
  const y = (v: number) => MARGEN.arr + h - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * h;
  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const base = y(min);
  const area = puntos.length > 1 ? `${linea} L${x(puntos.length - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z` : "";
  const texto = (v: number) => (sufijo ? `${Math.round(v)}${sufijo}` : formatoNota(v));
  const id = `degradado-${titulo.replace(/[^a-z0-9]/gi, "").slice(0, 24)}`;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${ancho} ${ALTO}`}
        role="img"
        aria-label={titulo}
        className="mx-auto block w-full"
        style={{ maxWidth: ancho * 1.5 }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--acento)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--acento)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {marcas.map((v) => (
          <g key={v}>
            <line x1={MARGEN.izq} x2={ancho - MARGEN.der} y1={y(v)} y2={y(v)} stroke="var(--borde)" strokeWidth="1" strokeDasharray={v === min ? undefined : "3 4"} />
            <text x={MARGEN.izq - 8} y={y(v) + 3.5} textAnchor="end" fontSize="9.5" fill="var(--texto-suave)">{v}{sufijo}</text>
          </g>
        ))}

        {area && <path d={area} fill={`url(#${id})`} />}
        {puntos.length > 1 && <path d={linea} fill="none" stroke="var(--acento)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

        {puntos.map((p, i) => {
          const ultimo = i === puntos.length - 1;
          // el valor va arriba del punto; si no hay lugar (punto en lo más alto), va abajo
          const arriba = y(p.valor) - 12 >= 8;
          return (
            <g key={i}>
              <circle cx={x(i)} cy={y(p.valor)} r={ultimo ? 5 : 3.5} fill="var(--acento)" stroke="var(--superficie)" strokeWidth="2" />
              <text
                x={x(i)}
                y={arriba ? y(p.valor) - 10 : y(p.valor) + 17}
                textAnchor="middle"
                fontSize={ultimo ? 11.5 : 10}
                fontWeight={ultimo ? 700 : 600}
                fill="var(--texto)"
              >
                {texto(p.valor)}
              </text>
              <text x={x(i)} y={ALTO - 9} textAnchor="middle" fontSize="9.5" fill="var(--texto-suave)">{p.etiqueta}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
