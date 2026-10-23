// Mientras una pantalla carga (consulta a la base) se muestra un esqueleto con la
// misma forma que el contenido, para que no quede una pantalla en blanco.
export default function Cargando() {
  return (
    <div className="space-y-5" role="status" aria-label="Cargando">
      <div className="space-y-2">
        <div className="h-9 w-2/3 animate-pulse rounded-lg bg-borde/60" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-borde/40" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="caja h-24 animate-pulse bg-borde/30" />
      ))}
    </div>
  );
}
