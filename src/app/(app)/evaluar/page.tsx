import Link from "next/link";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { nombrePeriodo, periodoActual, periodoAnterior, periodoSiguiente, periodoValido } from "@/lib/fechas";
import { formatoNota, promedio } from "@/lib/calculos";

export const metadata = { title: "Evaluar" };


export default async function PaginaEvaluar({ searchParams }: { searchParams: Promise<{ periodo?: string; categoria?: string }> }) {
  await requerirInstructor();
  const { periodo: pedido, categoria: categoriaPedida } = await searchParams;
  const actual = periodoActual();
  const periodo = pedido && periodoValido(pedido) ? pedido : actual;

  const categorias = await db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } });
  const categoriaId = categorias.find((c) => c.id === categoriaPedida)?.id ?? categorias[0]?.id;

  const alumnos = categoriaId
    ? await db.alumno.findMany({
        where: { categoriaId, activo: true },
        orderBy: { nombre: "asc" },
        include: { evaluaciones: { where: { periodo }, include: { items: true } } },
      })
    : [];
  const evaluados = alumnos.filter((a) => a.evaluaciones.length > 0).length;
  const enlace = (p: string, c?: string) => `/evaluar?periodo=${p}${c ? `&categoria=${c}` : ""}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl sm:text-4xl">Evaluar</h1>
        <p className="mt-1 text-suave">Una nota del 1 al 10 por criterio, una vez por mes.</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Link href={enlace(periodoAnterior(periodo), categoriaId)} className="boton" aria-label="Mes anterior">
          <ChevronLeft size={18} aria-hidden />
        </Link>
        <p className="font-semibold first-letter:uppercase">{nombrePeriodo(periodo)}</p>
        <Link href={enlace(periodoSiguiente(periodo), categoriaId)} className="boton" aria-label="Mes siguiente">
          <ChevronRight size={18} aria-hidden />
        </Link>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Categoría">
        <div className="relative flex gap-6 border-b border-borde">
          {categorias.map((c) => (
            <Link
              key={c.id}
              href={enlace(periodo, c.id)}
              role="tab"
              aria-selected={c.id === categoriaId}
              className="group shrink-0 whitespace-nowrap px-1 py-2.5 text-sm font-medium text-suave transition-colors duration-[160ms] aria-selected:text-acento hover:text-texto aria-selected:hover:text-acento"
            >
              {c.nombre}
              <span
                aria-hidden
                className="pointer-events-none mt-2 block h-[2px] origin-left scale-x-0 bg-acento transition-transform duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-aria-selected:scale-x-100"
              />
            </Link>
          ))}
        </div>
      </div>

      {categoriaId && (
        <>
          <p className="text-sm text-suave">
            {evaluados} de {alumnos.length} evaluados
          </p>
          {alumnos.length === 0 ? (
            <p className="caja p-4 text-suave">Esta categoría no tiene alumnos todavía.</p>
          ) : (
            <ul className="caja divide-y divide-borde">
              {alumnos.map((a) => {
                const ev = a.evaluaciones[0];
                const nota = ev ? promedio(ev.items.map((i) => i.valor)) : null;
                return (
                  <li key={a.id}>
                    <Link href={`/evaluar/${a.id}?periodo=${periodo}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 hover:bg-acento-suave">
                      <span>{a.nombre}</span>
                      {ev ? (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-ok">
                          <Check size={16} aria-hidden /> {formatoNota(nota)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-alerta-suave px-2.5 py-0.5 text-xs font-medium text-alerta">Pendiente</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
