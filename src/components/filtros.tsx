/** Fila de filtros: los botones se acomodan en las filas que hagan falta (nada se desliza de costado). */
export function Filtros({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {children}
    </div>
  );
}
