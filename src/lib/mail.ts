import nodemailer from "nodemailer";
import { VIGENCIA_MINUTOS } from "@/lib/reseteo";

// Envío de mails. Se configura con variables de entorno, según el servicio:
//   Gmail (no pide dominio):  GMAIL_USER (la cuenta) y GMAIL_APP_PASSWORD (contraseña de aplicación de 16 letras)
//   Resend (pide dominio verificado): RESEND_API_KEY y MAIL_FROM, ej.: "Bitácora CVSI <no-responder@tudominio.com>"
//   MAIL_CONSOLA=1  solo para probar en local: en lugar de enviar, muestra el mail en la consola del servidor
// Si están los dos servicios, se usa Resend.

export type ResultadoMail = { ok: true } | { ok: false; motivo: string };

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** ¿Está configurado el envío? Si no, la recuperación por mail no se ofrece. */
const conResend = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
const conGmail = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
export const mailConfigurado = () => process.env.MAIL_CONSOLA === "1" || conResend() || conGmail();

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
  if (!conResend()) return conGmail() ? enviarConGmail(para, mail) : { ok: false, motivo: "No hay servicio de mail configurado" };
  const clave = process.env.RESEND_API_KEY!;
  const desde = process.env.MAIL_FROM!;

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

async function enviarConGmail(para: string, mail: { asunto: string; texto: string; html: string }): Promise<ResultadoMail> {
  const usuario = process.env.GMAIL_USER!;
  // Las contraseñas de aplicación de Google se muestran con espacios; sin ellos funcionan igual.
  const clave = process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "");
  try {
    const transporte = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: usuario, pass: clave },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transporte.sendMail({ from: `"Bitácora CVSI" <${usuario}>`, to: para, subject: mail.asunto, text: mail.texto, html: mail.html });
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : "Error desconocido" };
  }
}
