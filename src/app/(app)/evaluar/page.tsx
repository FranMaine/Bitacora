import Link from "next/link";
import { Filtros } from "@/components/filtros";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { deFechaDB, fechaCorta, hoyAR } from "@/lib/fechas";
import { diasEntre, formatoNota, formatoTendencia, promedio, tendencia } from "@/lib/calculos";
import { Avatar } from "@/components/avatar";

export const metadata = { title: "Evaluar" };

function haceCuanto(dias: number): string {
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} d`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
}

// Se considera pendiente a quien no tiene ninguna evaluación en los últimos 30 días.
const DIAS_PENDIENTE = 30;

export default async function PaginaEvaluar({ searchParams }: { searchParams: Promise<{ categoria?: string; pendientes?: string }> }) {
  await requerirInstructor();
  const { categoria: categoriaPedida, pendientes: soloPendientes } = await searchParams;

  const categorias = await db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } });
  const categoriaId = categorias.find((c) => c.id === categoriaPedida)?.id ?? categorias[0]?.id;

  const alumnos = categoriaId
    ? await db.alumno.findMany({
        where: { categoriaId, activo: true },
        orderBy: { nombre: "asc" },
        include: { evaluaciones: { orderBy: { fecha: "asc" }, include: { items: { select: { valor: true } } } } },
      })
    : [];
  const hoy = hoyAR();
  const esPendiente = (a: (typeof alumnos)[number]) => {
    const ultima = a.evaluaciones.at(-1);
    return !ultima || diasEntre(deFechaDB(ultima.fecha), hoy) > DIAS_PENDIENTE;
  };
  const pendientes = alumnos.filter(esPendiente);
  const visibles = soloPendientes ? pendientes : alumnos;
  const enlaceCat = (id: string, pend: boolean) => `/evaluar?categoria=${id}${pend ? "&pendientes=1" : ""}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl sm:text-4xl">Evaluar</h1>
        <p className="mt-1 text-suave">
          Una nota del 1 al 10 por criterio. Podés evaluar a un alumno cuando quieras: cada evaluación queda guardada
          y se ve su evolución.
        </p>
      </div>

      <Filtros etiqueta="Categoría">
        {categorias.map((c) => (
          <Link key={c.id} href={enlaceCat(c.id, Boolean(soloPendientes))} aria-current={c.id === categoriaId ? "true" : undefined} className="filtro">
            {c.nombre}
          </Link>
        ))}
      </Filtros>

      {categoriaId &&
        (alumnos.length === 0 ? (
          <p className="caja p-4 text-suave">Esta categoría no tiene alumnos todavía.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-suave">
                {pendientes.length === 0
                  ? "Todos al día: evaluados en los últimos 30 días."
                  : `${pendientes.length} de ${alumnos.length} sin evaluar hace más de 30 días.`}
              </p>
              {pendientes.length > 0 && (
                <Link href={enlaceCat(categoriaId, !soloPendientes)} className="boton !min-h-9 text-sm">
                  {soloPendientes ? "Ver todos" : "Ver solo pendientes"}
                </Link>
              )}
            </div>
            <ul className="caja divide-y divide-borde">
            {visibles.map((a) => {
              const notas = a.evaluaciones.map((e) => promedio(e.items.map((i) => i.valor))).filter((n): n is number => n !== null);
              const ultima = a.evaluaciones.at(-1);
              const delta = formatoTendencia(tendencia(notas));
              const dias = ultima ? diasEntre(deFechaDB(ultima.fecha), hoy) : null;
              return (
                <li key={a.id}>
                  <Link href={`/evaluar/${a.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-acento-suave">
                    <Avatar nombre={a.nombre} tam={36} />
                    <div className="min-w-0 flex-1">
                      <p className="[overflow-wrap:anywhere]">{a.nombre}</p>
                      <p className="text-xs text-suave">
                        {ultima && dias !== null
                          ? `Última: ${fechaCorta(deFechaDB(ultima.fecha))} (${haceCuanto(dias)}) · ${a.evaluaciones.length} ${a.evaluaciones.length === 1 ? "evaluación" : "evaluaciones"}`
                          : "Sin evaluar"}
                      </p>
                    </div>
                    {notas.length > 0 ? (
                      <div className="flex shrink-0 items-baseline gap-1.5">
                        <span className="text-lg font-semibold">{formatoNota(notas.at(-1)!)}</span>
                        {delta && delta !== "=" && (
                          <span className={`text-xs font-medium ${delta.startsWith("+") ? "text-ok" : "text-peligro"}`}>{delta}</span>
                        )}
                      </div>
                    ) : (
                      <span className="chip chip-alerta shrink-0">Pendiente</span>
                    )}
                    <ChevronRight size={18} className="shrink-0 text-suave" aria-hidden />
                  </Link>
                </li>
              );
            })}
            </ul>
          </>
        ))}
    </div>
  );
}
