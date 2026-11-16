"use client";

import { useTransition } from "react";

/**
 * Envío de un formulario SIN que React lo reinicie al terminar.
 *
 * Con <form action={...}> React 19 vacía los campos cuando la acción termina, aunque haya salido mal: un error de
 * validación borraba todo lo escrito (notas de una evaluación, mail y contraseña, la categoría elegida…) y los
 * desplegables quedaban en blanco en pantalla. Con onSubmit los campos quedan como estaban; si algún formulario
 * quiere limpiarse cuando salió bien, lo hace él mismo (ver useLimpiar en ajustes).
 *
 * Uso: const [estado, accion, pendiente] = useActionState(...); const alEnviar = useEnvio(accion); <form onSubmit={alEnviar}>
 */
export function useEnvio(accion: (datos: FormData) => void) {
  const [, iniciar] = useTransition();
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // el botón que se tocó viaja con su name/value, igual que en un envío normal
    const datos = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    iniciar(() => accion(datos));
  };
}
