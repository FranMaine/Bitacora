import { VIGENCIA_MINUTOS } from "@/lib/reseteo";

// Envío de mails con Resend (https://resend.com). Se configura con variables de entorno:
//   RESEND_API_KEY  clave de la API
//   MAIL_FROM       remitente con dominio verificado en Resend, ej.: "Bitácora CVSI <no-responder@tudominio.com>"
//   MAIL_CONSOLA=1  solo para probar en local: en lugar de enviar, muestra el mail en la consola del servidor

export type ResultadoMail = { ok: true } | { ok: false; motivo: string };

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** ¿Está configurado el envío? Si no, la recuperación por mail no se ofrece. */
export const mailConfigurado = () => process.env.MAIL_CONSOLA === "1" || Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export function mailReseteo(nombre: string, enlace: string) {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  const saludo = primerNombre ? `Hola ${primerNombre},` : "Hola,";
  const texto = `${saludo}

Pediste elegir una contraseña nueva para Bitácora CVSI. Abrí este link para hacerlo (sirve una sola vez y vence en ${VIGENCIA_MINUTOS} minutos):

${enlace}

Si no lo pediste vos, ignorá este mail: tu contraseña sigue igual.`;
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#14181c">
<h2 style="margin:0 0 16px;color:#0b5f8f">Bitácora CVSI</h2>
<p style="font-size:16px;line-height:1.5">${escapar(saludo)}</p>
<p style="font-size:16px;line-height:1.5">Pediste elegir una contraseña nueva. Tocá el botón para hacerlo; sirve una sola vez y vence en ${VIGENCIA_MINUTOS} minutos.</p>
<p style="margin:28px 0"><a href="${escapar(enlace)}" style="background:#0b5f8f;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:600;font-size:16px;display:inline-block">Elegir contraseña nueva</a></p>
<p style="font-size:14px;line-height:1.5;color:#5b6670">Si el botón no funciona, copiá este link en el navegador:<br><span style="word-break:break-all">${escapar(enlace)}</span></p>
<p style="font-size:14px;line-height:1.5;color:#5b6670">Si no lo pediste vos, ignorá este mail: tu contraseña sigue igual.</p>
</div>`;
  return { asunto: "Elegí tu contraseña nueva de Bitácora", texto, html };
}

export async function enviarMail(para: string, mail: { asunto: string; texto: string; html: string }): Promise<ResultadoMail> {
  if (process.env.MAIL_CONSOLA === "1") {
    console.log(`[mail de prueba] para: ${para}\nasunto: ${mail.asunto}\n${mail.texto}`);
    return { ok: true };
  }
  const clave = process.env.RESEND_API_KEY;
  const desde = process.env.MAIL_FROM;
  if (!clave || !desde) return { ok: false, motivo: "Faltan RESEND_API_KEY o MAIL_FROM" };

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: desde, to: [para], subject: mail.asunto, text: mail.texto, html: mail.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { ok: false, motivo: `Resend respondió ${r.status}: ${(await r.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : "Error desconocido" };
  }
}
