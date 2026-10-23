import Link from "next/link";
import { ChevronLeft, ChevronRight, Waves, Wind } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { aFechaDB, fechaLarga, hoyAR, sumarDias } from "@/lib/fechas";
import { formatoDuracion, formatoNota, minutosEntre, porcentaje, promedio, textoCorriente, textoViento } from "@/lib/calculos";
import { resumenFases } from "@/lib/estadisticas";
import { SelectorFecha } from "@/components/selector-fecha";
import { TarjetasCategorias } from "./tarjetas-categorias";

export const metadata = { title: "Jornada" };

export default async function PaginaHoy({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  await requerirInstructor();
  const { fecha: pedida } = await searchParams;
  const hoy = hoyAR();
  const fecha = pedida && aFechaDB(pedida) ? pedida : hoy;
  const fechaDB = aFechaDB(fecha)!;

  const [categorias, entrenamientos, alumnosPorCategoria] = await Promise.all([
    db.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    db.entrenamiento.findMany({
      where: { fecha: fechaDB },
      include: {
        asistencias: { select: { presente: true } },
        temas: { include: { tema: true } },
        notasFase: { select: { valor: true, faseId: true, fase: { select: { nombre: true, orden: true } } } },
      },
    }),
    db.alumno.groupBy({ by: ["categoriaId"], where: { activo: true }, _count: true }),
  ]);
  const cantidad = new Map(alumnosPorCategoria.map((a) => [a.categoriaId, a._count]));
  const porCategoria = new Map(entrenamientos.map((e) => [e.categoriaId, e]));

  // --- estadísticas del día (solo lo ya realizado)
  const hechos = entrenamientos.filter((e) => e.realizado);
  const minutosDia = hechos.reduce((s, e) => s + (minutosEntre(e.horaBajada, e.horaRegreso) ?? 0), 0);
  const presentesDia = hechos.reduce((s, e) => s + e.asistencias.filter((a) => a.presente).length, 0);
  const listadosDia = hechos.reduce((s, e) => s + e.asistencias.length, 0);
  const vientoDia = promedio(hechos.map((e) => e.vientoNudos).filter((n): n is number => n !== null));
  const corrienteDia = promedio(hechos.map((e) => e.corrienteNudos).filter((n): n is number => n !== null));
  const direccionesDia = [...new Set(hechos.map((e) => e.vientoDir).filter((d): d is string => !!d))];
  const temasDia = [...new Set(hechos.flatMap((e) => e.temas.filter((t) => t.realizado).map((t) => t.tema.nombre)))];
  const fasesDia = resumenFases(
    hechos.filter((e) => e.tipo === "REGATA").flatMap((e) => e.notasFase.map((n) => ({ faseId: n.faseId, nombre: n.fase.nombre, orden: n.fase.orden, valor: n.valor }))),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-suave">
          {fecha === hoy ? "Jornada de hoy" : "Jornada"}
        </p>
        <h1 className="display mt-1 text-3xl text-balance first-letter:uppercase sm:text-4xl">
          {fechaLarga(fecha)}
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/jornada?fecha=${sumarDias(fecha, -1)}`} className="boton" aria-label="Día anterior">
            <ChevronLeft size={18} aria-hidden />
          </Link>
          <SelectorFecha fecha={fecha} />
          <Link href={`/jornada?fecha=${sumarDias(fecha, 1)}`} className="boton" aria-label="Día siguiente">
            <ChevronRight size={18} aria-hidden />
          </Link>
          {fecha !== hoy && (
            <Link href="/jornada" className="boton">Hoy</Link>
          )}
        </div>
      </div>

      <section className="caja space-y-3 p-4" aria-label="Estadísticas del día">
        <h2 className="font-semibold">Estadísticas del día</h2>
        {hechos.length === 0 ? (
          <p className="text-sm text-suave">Todavía no hay entrenamientos dados por realizados en este día. Cuando se carguen, acá aparece el resumen.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[12px] bg-borde/40 p-3">
                <p className="text-xs text-suave">Salidas</p>
                <p className="text-xl font-semibold">{hechos.length}</p>
              </div>
              <div className="rounded-[12px] bg-borde/40 p-3">
                <p className="text-xs text-suave">En el agua</p>
                <p className="text-xl font-semibold">{minutosDia ? formatoDuracion(minutosDia) : "—"}</p>
              </div>
              <div className="rounded-[12px] bg-borde/40 p-3">
                <p className="text-xs text-suave">Asistencia</p>
                <p className="text-xl font-semibold">{listadosDia ? `${porcentaje(presentesDia, listadosDia)}%` : "—"}</p>
                <p className="text-xs text-suave">{presentesDia} de {listadosDia}</p>
              </div>
              <div className="rounded-[12px] bg-borde/40 p-3">
                <p className="text-xs text-suave">Chicos en el agua</p>
                <p className="text-xl font-semibold">{presentesDia}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-[12px] bg-borde/40 p-3 text-sm">
                <Wind size={18} className="shrink-0 text-acento" aria-hidden />
                <div>
                  <p className="text-xs text-suave">Viento</p>
                  <p className="font-semibold">
                    {vientoDia === null && direccionesDia.length === 0 ? "—" : `${direccionesDia.join("/")}${direccionesDia.length && vientoDia !== null ? " " : ""}${vientoDia !== null ? `${formatoNota(vientoDia)} kn` : ""}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-[12px] bg-borde/40 p-3 text-sm">
                <Waves size={18} className="shrink-0 text-acento" aria-hidden />
                <div>
                  <p className="text-xs text-suave">Corriente</p>
                  <p className="font-semibold">
                    {textoCorriente(
                      [...new Set(hechos.map((e) => e.corrienteDir).filter((d): d is string => !!d))].join("/") || null,
                      corrienteDia,
                    ) ?? "—"}
                  </p>
                </div>
              </div>
            </div>
            {temasDia.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-suave">Temas trabajados</p>
                <ul className="flex flex-wrap gap-2">
                  {temasDia.map((t) => (
                    <li key={t} className="chip">{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {fasesDia.length > 0 && (
              <p className="text-sm text-suave">
                En la regata, la fase más floja fue <strong className="font-medium text-texto">{fasesDia[0].nombre}</strong> ({fasesDia[0].pctBien}% bien).
              </p>
            )}
          </>
        )}
      </section>

      {categorias.length === 0 ? (
        <p className="caja p-4 text-suave">
          Todavía no hay categorías. Creá la primera en <Link href="/ajustes" className="text-acento underline">Ajustes</Link>.
        </p>
      ) : (
        <TarjetasCategorias
          fecha={fecha}
          categorias={categorias.map((c) => {
            const e = porCategoria.get(c.id);
            return {
              id: c.id,
              nombre: c.nombre,
              total: cantidad.get(c.id) ?? 0,
              presentes: e?.asistencias.filter((a) => a.presente).length ?? 0,
              minutos: e ? minutosEntre(e.horaBajada, e.horaRegreso) : null,
              viento: e ? textoViento(e.vientoDir, e.vientoNudos) : null,
              corriente: e ? textoCorriente(e.corrienteDir, e.corrienteNudos) : null,
              tipo: e?.tipo === "REGATA" ? "REGATA" : "ENTRENAMIENTO",
              estado: e?.realizado ? "realizado" : e ? "planificado" : "sin_cargar",
              temas: e?.temas.map((t) => t.tema.nombre) ?? [],
            };
          })}
        />
      )}
    </div>
  );
}
