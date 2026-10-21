import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { aFechaDB, fechaLarga, hoyAR, sumarDias } from "@/lib/fechas";
import { formatoDuracion, minutosEntre } from "@/lib/calculos";
import { SelectorFecha } from "@/components/selector-fecha";

export const metadata = { title: "Hoy" };

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
      include: { asistencias: { select: { presente: true } }, temas: { include: { tema: true } } },
    }),
    db.alumno.groupBy({ by: ["categoriaId"], where: { activo: true }, _count: true }),
  ]);
  const cantidad = new Map(alumnosPorCategoria.map((a) => [a.categoriaId, a._count]));
  const porCategoria = new Map(entrenamientos.map((e) => [e.categoriaId, e]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-suave">{fecha === hoy ? "Hoy" : "Día elegido"}</p>
        <h1 className="text-2xl font-semibold first-letter:uppercase tracking-tight">{fechaLarga(fecha)}</h1>
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/?fecha=${sumarDias(fecha, -1)}`} className="boton" aria-label="Día anterior">
            <ChevronLeft size={18} aria-hidden />
          </Link>
          <SelectorFecha fecha={fecha} />
          <Link href={`/?fecha=${sumarDias(fecha, 1)}`} className="boton" aria-label="Día siguiente">
            <ChevronRight size={18} aria-hidden />
          </Link>
          {fecha !== hoy && (
            <Link href="/" className="boton">Hoy</Link>
          )}
        </div>
      </div>

      {categorias.length === 0 ? (
        <p className="caja p-4 text-suave">
          Todavía no hay categorías. Creá la primera en <Link href="/ajustes" className="text-acento underline">Ajustes</Link>.
        </p>
      ) : (
        <ul className="space-y-3">
          {categorias.map((c) => {
            const e = porCategoria.get(c.id);
            const total = cantidad.get(c.id) ?? 0;
            const presentes = e?.asistencias.filter((a) => a.presente).length ?? 0;
            const minutos = e ? minutosEntre(e.horaBajada, e.horaRegreso) : null;
            const estado = e?.realizado ? "Realizado" : e ? "Planificado" : null;
            return (
              <li key={c.id}>
                <Link
                  href={`/entrenamiento/${fecha}/${c.id}`}
                  className="caja flex items-center justify-between gap-3 p-4 transition-colors hover:border-acento"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{c.nombre}</p>
                    <p className="mt-0.5 text-sm text-suave">
                      {total} {total === 1 ? "alumno" : "alumnos"}
                      {e?.realizado && ` · ${presentes} presentes`}
                      {minutos !== null && ` · ${formatoDuracion(minutos)} en el agua`}
                    </p>
                    {e && e.temas.length > 0 && (
                      <p className="mt-1 truncate text-sm text-suave">
                        {e.temas.map((t) => t.tema.nombre).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {estado ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          e?.realizado ? "bg-ok-suave text-ok" : "bg-alerta-suave text-alerta"
                        }`}
                      >
                        {estado}
                      </span>
                    ) : (
                      <span className="text-sm text-suave">Sin cargar</span>
                    )}
                    <ChevronRight size={18} className="text-suave" aria-hidden />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
