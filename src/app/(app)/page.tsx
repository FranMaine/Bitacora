import { redirect } from "next/navigation";

// La portada de la app son las estadísticas; la jornada del día vive en /jornada.
export default function Inicio() {
  redirect("/estadisticas");
}
