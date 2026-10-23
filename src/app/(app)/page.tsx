import { redirect } from "next/navigation";

// La portada de la app es la Jornada (con las estadísticas del día arriba).
export default function Inicio() {
  redirect("/jornada");
}
