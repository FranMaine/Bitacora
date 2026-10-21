import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { aFechaDB, fechaLarga, hoyAR, sumarDias } from "@/lib/fechas";
import { minutosEntre } from "@/lib/calculos";
import { SelectorFecha } from "@/components/selector-fecha";
import { TarjetasCategorias } from "./tarjetas-categorias";

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
              estado: e?.realizado ? "realizado" : e ? "planificado" : "sin_cargar",
              temas: e?.temas.map((t) => t.tema.nombre) ?? [],
            };
          })}
        />
      )}
    </div>
  );
}
