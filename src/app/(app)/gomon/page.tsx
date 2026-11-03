import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, RotateCcw, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { deFechaDB, fechaCorta, hoyAR, nombrePeriodo, periodoDe } from "@/lib/fechas";
import { formatoNota } from "@/lib/calculos";
import { diasPendiente, diasQueTardo, formatoPesos, gastoTotal, haceDias, resumenMantenimiento, tardoTexto } from "@/lib/mantenimiento";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { eliminarObservacion, reabrir } from "./actions";
import { EditarCosto, FormularioObservacion, MarcarArreglado } from "./formularios";

export const metadata = { title: "Botes" };

export default async function PaginaGomon({ searchParams }: { searchParams: Promise<{ bote?: string }> }) {
  await requerirInstructor();
  const { bote: pedido } = await searchParams;
  const hoy = hoyAR();

  const embarcaciones = await db.embarcacion.findMany({ where: { activa: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
  const embarcacion = embarcaciones.find((e) => e.id === pedido) ?? embarcaciones[0];

  if (!embarcacion) {
    return (
      <div className="space-y-4">
        <h1 className="display text-3xl sm:text-4xl">Botes</h1>
        <p className="caja p-4 text-suave">
          No hay embarcaciones cargadas. Agregá una en <Link href="/ajustes" className="text-acento underline">Ajustes</Link>.
        </p>
      </div>
    );
  }

  // Gasto de cada bote (todos, no solo el que se está mirando) para compararlos.
  const gastos = await db.mantenimiento.groupBy({
    by: ["embarcacionId"],
    where: { estado: "ARREGLADO" },
    _sum: { costo: true },
    _count: { _all: true },
  });
  const pendientesPorBote = new Map(
    (await db.mantenimiento.groupBy({ by: ["embarcacionId"], where: { estado: "PENDIENTE" }, _count: { _all: true } })).map((g) => [g.embarcacionId, g._count._all]),
  );
  const gastoDe = new Map(gastos.map((g) => [g.embarcacionId, { total: g._sum.costo ?? 0, arreglos: g._count._all }]));
  const gastoTodos = [...gastoDe.values()].reduce((s, g) => s + g.total, 0);

  const items = await db.mantenimiento.findMany({
    where: { embarcacionId: embarcacion.id },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    include: { creadoPor: { select: { nombre: true } }, resueltoPor: { select: { nombre: true } } },
  });
  const datos = items.map((i) => ({ ...i, fechaTxt: deFechaDB(i.fecha), resueltoTxt: i.resueltoEn ? deFechaDB(i.resueltoEn) : null }));
  const gastoBote = gastoTotal(datos);
  const resumen = resumenMantenimiento(datos.map((i) => ({ estado: i.estado, urgente: i.urgente, fecha: i.fechaTxt, resueltoEn: i.resueltoTxt })), hoy);

  // Pendientes: primero lo urgente y, dentro de cada grupo, lo que más hace que espera.
  const pendientes = datos
    .filter((i) => i.estado !== "ARREGLADO")
    .sort((a, b) => Number(b.urgente) - Number(a.urgente) || a.fechaTxt.localeCompare(b.fechaTxt));
  // Historial: lo arreglado, lo más reciente arriba, agrupado por mes de arreglo.
  const historial = datos
    .filter((i) => i.estado === "ARREGLADO")
    .sort((a, b) => (b.resueltoTxt ?? "").localeCompare(a.resueltoTxt ?? ""));
  const porMes = new Map<string, typeof historial>();
  for (const i of historial) {
    const mes = periodoDe(i.resueltoTxt ?? i.fechaTxt);
    porMes.set(mes, [...(porMes.get(mes) ?? []), i]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl sm:text-4xl">{embarcacion.nombre}</h1>
        <p className="mt-1 text-suave">Cada observación queda pendiente hasta que se arregla; con la fecha y el costo del arreglo se arma el historial y el gasto de cada bote.</p>
      </div>

      {embarcaciones.length > 1 && (
        <div className="sin-barra -mx-4 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Embarcación">
          <div className="flex gap-6 border-b border-borde">
            {embarcaciones.map((e) => (
              <Link
                key={e.id}
                href={`/gomon?bote=${e.id}`}
                role="tab"
                aria-selected={e.id === embarcacion.id}
                className="group shrink-0 whitespace-nowrap px-1 py-2.5 text-sm font-medium text-suave transition-colors duration-[160ms] aria-selected:text-acento hover:text-texto aria-selected:hover:text-acento"
              >
                {e.nombre}
                {(pendientesPorBote.get(e.id) ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-alerta-suave px-1.5 text-[0.6875rem] font-semibold text-alerta" title="Observaciones pendientes">
                    {pendientesPorBote.get(e.id)}
                  </span>
                )}
                <span aria-hidden className="pointer-events-none mt-2 block h-[2px] origin-left scale-x-0 bg-acento transition-transform duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-aria-selected:scale-x-100" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`caja p-3 ${resumen.pendientes ? "border-alerta" : ""}`}>
          <p className="text-xs text-suave">Pendientes</p>
          <p className={`text-xl font-semibold ${resumen.urgentes ? "text-peligro" : ""}`}>{resumen.pendientes}</p>
          <p className="text-xs text-suave">{resumen.urgentes ? `${resumen.urgentes} urgente${resumen.urgentes === 1 ? "" : "s"}` : "ninguno urgente"}</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">Arreglados</p>
          <p className="text-xl font-semibold">{resumen.arreglados}</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">Gastado en arreglos</p>
          <p className="text-xl font-semibold">{formatoPesos(gastoBote)}</p>
          <p className="text-xs text-suave">{gastoBote === 0 && resumen.arreglados > 0 ? "sin costos cargados" : "en este bote"}</p>
        </div>
        <div className="caja p-3">
          <p className="text-xs text-suave">Tardan en arreglarse</p>
          <p className="text-xl font-semibold">{resumen.diasMedios === null ? "—" : `${formatoNota(resumen.diasMedios)} d`}</p>
          <p className="text-xs text-suave">en promedio</p>
        </div>
      </section>

      <FormularioObservacion embarcacionId={embarcacion.id} hoy={hoy} />

      <section className="space-y-3">
        <h2 className="font-semibold">Pendientes</h2>
        {pendientes.length === 0 ? (
          <p className="caja flex items-center gap-2 p-4 text-sm text-suave">
            <CheckCircle2 size={18} className="text-ok" aria-hidden /> No hay nada pendiente: el bote está al día.
          </p>
        ) : (
          <ul className="space-y-3">
            {pendientes.map((i) => (
              <li key={i.id} className={`caja space-y-3 p-4 ${i.urgente ? "border-peligro" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {i.urgente && (
                    <span className="chip" style={{ background: "color-mix(in oklab, var(--peligro) 14%, transparent)", color: "var(--peligro)" }}>
                      <AlertTriangle size={13} aria-hidden /> Urgente
                    </span>
                  )}
                  <span className="chip chip-alerta">Pendiente</span>
                  <span className="text-sm text-suave">
                    desde el {fechaCorta(i.fechaTxt)} · {haceDias(diasPendiente(i.fechaTxt, hoy))}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{i.descripcion}</p>
                <p className="text-xs text-suave">Lo cargó {i.creadoPor.nombre}</p>
                <div className="flex flex-wrap items-start gap-2">
                  <MarcarArreglado id={i.id} fechaObservada={i.fechaTxt} hoy={hoy} />
                  <form action={eliminarObservacion.bind(null, i.id)}>
                    <BotonConfirmar mensaje="¿Borrar esta observación? Usalo solo si se cargó por error." className="boton !min-h-10 text-sm text-suave">
                      <Trash2 size={15} aria-hidden /> Borrar
                    </BotonConfirmar>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Historial del bote</h2>
          {datos.length > 0 && (
            <a href={`/api/exportar?tipo=gomon&bote=${embarcacion.id}`} className="boton !min-h-9 text-sm" download>
              <Download size={15} aria-hidden /> Descargar para Excel
            </a>
          )}
        </div>
        {historial.length === 0 ? (
          <p className="caja p-4 text-sm text-suave">Todavía no hay arreglos registrados. Cuando se marque algo como arreglado, queda acá con su fecha.</p>
        ) : (
          [...porMes.entries()].map(([mes, lista]) => (
            <div key={mes} className="space-y-2">
              <p className="text-sm font-medium text-suave first-letter:uppercase">{nombrePeriodo(mes)}</p>
              <ul className="caja divide-y divide-borde">
                {lista.map((i) => (
                  <li key={i.id} className="space-y-1.5 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip chip-ok">Arreglado el {fechaCorta(i.resueltoTxt!)}</span>
                      <span className="text-xs text-suave">
                        visto el {fechaCorta(i.fechaTxt)} · se arregló {tardoTexto(diasQueTardo(i.fechaTxt, i.resueltoTxt!))}
                      </span>
                      {i.urgente && <span className="chip chip-alerta">Fue urgente</span>}
                    </div>
                    <p className="whitespace-pre-wrap">{i.descripcion}</p>
                    {i.costo !== null && <p className="text-sm font-semibold">Costo: {formatoPesos(i.costo)}</p>}
                    {i.solucion && (
                      <p className="whitespace-pre-wrap rounded-[10px] bg-ok-suave px-3 py-2 text-sm text-ok">Se hizo: {i.solucion}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-suave">
                        Lo cargó {i.creadoPor.nombre}
                        {i.resueltoPor && ` · lo arregló ${i.resueltoPor.nombre}`}
                      </p>
                      <EditarCosto id={i.id} costo={i.costo} />
                      <form action={reabrir.bind(null, i.id)}>
                        <BotonConfirmar mensaje="¿Volver a dejar esto como pendiente?" className="inline-flex items-center gap-1 text-xs font-medium text-suave underline-offset-4 hover:text-texto hover:underline">
                          <RotateCcw size={13} aria-hidden /> Volver a pendiente
                        </BotonConfirmar>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Gasto por bote</h2>
        <ul className="caja divide-y divide-borde">
          {embarcaciones.map((e) => {
            const g = gastoDe.get(e.id);
            return (
              <li key={e.id}>
                <Link href={`/gomon?bote=${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-acento-suave/40">
                  <span className="font-medium">{e.nombre}</span>
                  <span className="text-right">
                    <span className="font-semibold">{formatoPesos(g?.total ?? 0)}</span>
                    <span className="block text-xs text-suave">{g?.arreglos ?? 0} {(g?.arreglos ?? 0) === 1 ? "arreglo" : "arreglos"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="font-semibold">Total de todos los botes</span>
            <span className="font-semibold">{formatoPesos(gastoTodos)}</span>
          </li>
        </ul>
        <a href="/api/exportar?tipo=gomon" className="boton !min-h-9 text-sm" download>
          <Download size={15} aria-hidden /> Descargar todos los botes
        </a>
      </section>
    </div>
  );
}
