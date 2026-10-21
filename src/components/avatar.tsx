// Iniciales en un círculo con un color único por nombre: cada chico tiene siempre
// el mismo color. Usamos HSL con saturación y luminosidad fijas para que ningún
// avatar quede demasiado chillón, y bajamos la luminosidad en modo oscuro.

function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function Avatar({ nombre, tam = 36 }: { nombre: string; tam?: number }) {
  const h = hash(nombre) % 360;
  return (
    <span
      aria-hidden
      className="avatar flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={
        {
          width: tam,
          height: tam,
          fontSize: Math.round(tam * 0.38),
          "--h": h,
        } as React.CSSProperties
      }
    >
      {iniciales(nombre)}
    </span>
  );
}
