"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, ClipboardCheck, BarChart3, Settings } from "lucide-react";

const ITEMS = [
  { href: "/estadisticas", texto: "Estadísticas", Icono: BarChart3 },
  { href: "/jornada", texto: "Jornada", Icono: CalendarDays },
  { href: "/alumnos", texto: "Alumnos", Icono: Users },
  { href: "/evaluar", texto: "Evaluar", Icono: ClipboardCheck },
  { href: "/ajustes", texto: "Ajustes", Icono: Settings },
];

function activo(ruta: string, href: string) {
  if (href === "/jornada") return ruta.startsWith("/jornada") || ruta.startsWith("/entrenamiento");
  if (href === "/estadisticas") return ruta === "/" || ruta.startsWith("/estadisticas");
  return ruta === href || ruta.startsWith(`${href}/`);
}

/** Barra fija abajo en el celular; en pantallas grandes, links arriba. */
export function Navegacion({ variante }: { variante: "barra" | "superior" }) {
  const ruta = usePathname();

  if (variante === "superior") {
    return (
      <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
        {ITEMS.map(({ href, texto }) => (
          <Link
            key={href}
            href={href}
            aria-current={activo(ruta, href) ? "page" : undefined}
            className="rounded-[12px] px-3 py-2 text-sm font-medium text-suave hover:text-texto aria-[current=page]:bg-acento-suave aria-[current=page]:text-acento"
          >
            {texto}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {ITEMS.map(({ href, texto, Icono }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={activo(ruta, href) ? "page" : undefined}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium text-suave aria-[current=page]:text-acento"
            >
              <Icono size={22} strokeWidth={1.75} aria-hidden />
              {texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
