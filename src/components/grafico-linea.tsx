import { formatoNota } from "@/lib/calculos";

type Punto = { etiqueta: string; valor: number };

/** Línea simple de notas (escala 1–10) con SVG puro: sin librerías. */
export function GraficoLinea({ puntos, titulo }: { puntos: Punto[]; titulo: string }) {
  const ancho = 320;
  const alto = 140;
  const m = { izq: 24, der: 12, arr: 12, aba: 26 };
  const w = ancho - m.izq - m.der;
  const h = alto - m.arr - m.aba;
  const x = (i: number) => m.izq + (puntos.length === 1 ? w / 2 : (i / (puntos.length - 1)) * w);
  const y = (v: number) => m.arr + h - ((v - 1) / 9) * h;
  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");

  return (
    <figure>
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={titulo} className="w-full">
        {[1, 5, 10].map((v) => (
          <g key={v}>
            <line x1={m.izq} x2={ancho - m.der} y1={y(v)} y2={y(v)} stroke="var(--borde)" strokeWidth="1" />
            <text x={m.izq - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--texto-suave)">{v}</text>
          </g>
        ))}
        {puntos.length > 1 && <path d={linea} fill="none" stroke="var(--acento)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {puntos.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.valor)} r="4" fill="var(--acento)" />
            <text x={x(i)} y={y(p.valor) - 9} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--texto)">{formatoNota(p.valor)}</text>
            <text x={x(i)} y={alto - 8} textAnchor="middle" fontSize="10" fill="var(--texto-suave)">{p.etiqueta}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
