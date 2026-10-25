import { db } from "@/lib/db";
import { requerirInstructor } from "@/lib/auth";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { cambiarActivoInstructor, cambiarActivoItem, renombrarItem, type TipoCatalogo } from "./actions";
import { FormularioAgregarItem, FormularioClave, FormularioInstructor } from "./formularios";

export const metadata = { title: "Ajustes" };

type Fila = { id: string; nombre: string; activo: boolean };

function Catalogo({ tipo, titulo, ayuda, placeholder, filas }: { tipo: TipoCatalogo; titulo: string; ayuda: string; placeholder: string; filas: Fila[] }) {
  return (
    <section className="caja space-y-3 p-4">
      <div>
        <h2 className="font-semibold">{titulo}</h2>
        <p className="text-sm text-suave">{ayuda}</p>
      </div>
      <ul className="divide-y divide-borde">
        {filas.map((f) => (
          <li key={f.id} className="flex items-center gap-2 py-2">
            <form action={renombrarItem.bind(null, tipo, f.id)} className="flex min-w-0 flex-1 gap-2">
              <input
                name="nombre"
                defaultValue={f.nombre}
                aria-label={`Nombre de ${f.nombre}`}
                className={`campo !min-h-10 ${f.activo ? "" : "text-suave line-through"}`}
              />
              <button type="submit" className="boton !min-h-10 shrink-0 text-sm">Guardar</button>
            </form>
            <form action={cambiarActivoItem.bind(null, tipo, f.id, !f.activo)}>
              {f.activo ? (
                <BotonConfirmar mensaje={`¿Archivar "${f.nombre}"? Deja de ofrecerse, pero se conserva lo ya cargado.`} className="boton boton-peligro !min-h-10 text-sm">
                  Archivar
                </BotonConfirmar>
              ) : (
                <button type="submit" className="boton !min-h-10 text-sm">Reactivar</button>
              )}
            </form>
          </li>
        ))}
      </ul>
      <FormularioAgregarItem tipo={tipo} placeholder={placeholder} />
    </section>
  );
}

export default async function PaginaAjustes() {
  const yo = await requerirInstructor();
  const [categorias, temas, criterios, fases, instructores] = await Promise.all([
    db.categoria.findMany({ orderBy: { orden: "asc" } }),
    db.tema.findMany({ orderBy: { orden: "asc" } }),
    db.criterio.findMany({ orderBy: { orden: "asc" } }),
    db.faseRegata.findMany({ orderBy: { orden: "asc" } }),
    db.instructor.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, email: true, activo: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="display text-3xl sm:text-4xl">Ajustes</h1>

      <Catalogo
        tipo="categoria"
        titulo="Categorías"
        ayuda="Los grupos de alumnos. Archivar una la oculta de las listas sin perder su historial."
        placeholder="Ej.: Optimist Avanzados"
        filas={categorias.map((c) => ({ id: c.id, nombre: c.nombre, activo: c.activa }))}
      />
      <Catalogo
        tipo="tema"
        titulo="Temas de entrenamiento"
        ayuda="Lo que se practica en el agua (popa, ceñida, largadas…). Alimentan las estadísticas de qué se entrenó."
        placeholder="Ej.: Planeo"
        filas={temas}
      />
      <Catalogo
        tipo="criterio"
        titulo="Criterios de evaluación"
        ayuda="Los ítems que se puntúan del 1 al 10 en la evaluación mensual de cada alumno."
        placeholder="Ej.: Velocidad"
        filas={criterios}
      />
      <Catalogo
        tipo="fase"
        titulo="Fases de la regata"
        ayuda="Lo que se califica a cada chico (mala, regular o bien) en un día de regata: largada, primera ceñida, popa…"
        placeholder="Ej.: Llegada"
        filas={fases.map((f) => ({ id: f.id, nombre: f.nombre, activo: f.activa }))}
      />

      <section className="caja space-y-3 p-4">
        <div>
          <h2 className="font-semibold">Instructores</h2>
          <p className="text-sm text-suave">Todos ven todo. Un instructor desactivado ya no puede ingresar.</p>
        </div>
        <ul className="divide-y divide-borde">
          {instructores.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className={`truncate font-medium ${i.activo ? "" : "text-suave line-through"}`}>
                  {i.nombre} {i.id === yo.id && <span className="chip ml-1">vos</span>}
                </p>
                <p className="truncate text-sm text-suave">{i.email}</p>
              </div>
              {i.id !== yo.id && (
                <form action={cambiarActivoInstructor.bind(null, i.id, !i.activo)}>
                  {i.activo ? (
                    <BotonConfirmar mensaje={`¿Desactivar a ${i.nombre}? No va a poder ingresar hasta que lo reactives.`} className="boton boton-peligro !min-h-10 text-sm">
                      Desactivar
                    </BotonConfirmar>
                  ) : (
                    <button type="submit" className="boton !min-h-10 text-sm">Reactivar</button>
                  )}
                </form>
              )}
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer font-medium text-acento">Agregar instructor</summary>
          <div className="mt-3">
            <FormularioInstructor />
          </div>
        </details>
      </section>

      <section className="caja space-y-3 p-4">
        <h2 className="font-semibold">Mi contraseña</h2>
        <FormularioClave />
      </section>
    </div>
  );
}
