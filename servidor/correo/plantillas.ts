import { formatearParaCorreo } from '../auth/codigos'
import { POLITICA } from '../auth/politica'
import type { CorreoSaliente } from '../auth/puertos'

/**
 * Plantillas de correo.
 *
 * Se envían siempre en HTML y en texto plano: hay clientes que no muestran
 * HTML, y un correo sin alternativa de texto puntúa peor en los filtros de
 * spam. El código aparece en el asunto además del cuerpo, porque así se lee
 * desde la notificación del móvil sin abrir nada.
 *
 * No llevan enlaces ni imágenes remotas: un correo de acceso que pide hacer
 * clic es justo lo que imita el phishing, y las imágenes externas delatan
 * cuándo se abrió el mensaje.
 */

const MINUTOS_VIGENCIA = Math.round(POLITICA.vidaCodigoMs / 60000)

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function envoltura(titulo: string, cuerpo: string): string {
  // Estilos en línea y tabla de un solo bloque: es lo único que respetan por
  // igual Gmail, Outlook y Apple Mail.
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#11151e;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e3e6ec;">
    <tr><td style="padding:28px 28px 8px;">
      <div style="font-size:15px;font-weight:700;letter-spacing:-0.02em;">Gym Bro</div>
    </td></tr>
    <tr><td style="padding:0 28px 28px;">${cuerpo}</td></tr>
  </table>
  <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#6b7280;line-height:1.5;">
    Si no pediste esto, podés ignorar el mensaje: sin el código no se puede entrar a la cuenta.
  </p>
</body>
</html>`
}

function bloqueCodigo(codigo: string): string {
  return `<div style="margin:20px 0;padding:18px;background:#f7f9fc;border:1px solid #e3e6ec;border-radius:12px;text-align:center;">
      <div style="font-size:32px;font-weight:700;letter-spacing:0.14em;font-variant-numeric:tabular-nums;">${escapar(
        formatearParaCorreo(codigo),
      )}</div>
      <div style="margin-top:6px;font-size:12px;color:#6b7280;">Vence en ${MINUTOS_VIGENCIA} minutos</div>
    </div>`
}

export function correoSegundoFactor(para: string, nombre: string, codigo: string): CorreoSaliente {
  const saludo = nombre.trim() ? `Hola, ${nombre.trim()}.` : 'Hola.'
  const html = envoltura(
    'Tu código de acceso',
    `<p style="margin:0;font-size:15px;line-height:1.6;">${escapar(saludo)}</p>
     <p style="margin:10px 0 0;font-size:15px;line-height:1.6;">Este es tu código para entrar a Gym Bro:</p>
     ${bloqueCodigo(codigo)}
     <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
       Nadie de Gym Bro te lo va a pedir por mensaje ni por teléfono. Si alguien lo hace, no se lo des.
     </p>`,
  )

  const texto = [
    saludo,
    '',
    'Tu código para entrar a Gym Bro:',
    '',
    `    ${formatearParaCorreo(codigo)}`,
    '',
    `Vence en ${MINUTOS_VIGENCIA} minutos.`,
    '',
    'Nadie de Gym Bro te lo va a pedir por mensaje ni por teléfono.',
    'Si no pediste esto, ignorá el mensaje: sin el código no se puede entrar.',
  ].join('\n')

  return { para, asunto: `${formatearParaCorreo(codigo)} es tu código de Gym Bro`, html, texto }
}

export function correoVerificarEmail(para: string, nombre: string, codigo: string): CorreoSaliente {
  const saludo = nombre.trim() ? `Bienvenido, ${nombre.trim()}.` : 'Bienvenido.'
  const html = envoltura(
    'Confirmá tu correo',
    `<p style="margin:0;font-size:15px;line-height:1.6;">${escapar(saludo)}</p>
     <p style="margin:10px 0 0;font-size:15px;line-height:1.6;">
       Para terminar de crear tu cuenta, escribí este código en la aplicación:
     </p>
     ${bloqueCodigo(codigo)}`,
  )

  const texto = [
    saludo,
    '',
    'Para terminar de crear tu cuenta, escribí este código en la aplicación:',
    '',
    `    ${formatearParaCorreo(codigo)}`,
    '',
    `Vence en ${MINUTOS_VIGENCIA} minutos.`,
  ].join('\n')

  return { para, asunto: `${formatearParaCorreo(codigo)} confirma tu cuenta de Gym Bro`, html, texto }
}

/**
 * Aviso de sesión nueva. No lleva código ni enlace de acción: solo informa,
 * para que un acceso ajeno no pase inadvertido.
 */
export function correoSesionNueva(
  para: string,
  datos: { fecha: Date; agente?: string; ip?: string },
): CorreoSaliente {
  const cuando = datos.fecha.toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })
  const desde = [datos.agente, datos.ip].filter(Boolean).join(' · ') || 'origen desconocido'

  const html = envoltura(
    'Se inició sesión en tu cuenta',
    `<p style="margin:0;font-size:15px;line-height:1.6;">Se inició sesión en tu cuenta de Gym Bro.</p>
     <p style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.6;">
       ${escapar(cuando)}<br>${escapar(desde)}
     </p>
     <p style="margin:16px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
       Si fuiste vos, no hace falta que hagas nada. Si no, cambiá tu contraseña cuanto antes.
     </p>`,
  )

  const texto = [
    'Se inició sesión en tu cuenta de Gym Bro.',
    '',
    cuando,
    desde,
    '',
    'Si fuiste vos, no hace falta que hagas nada.',
    'Si no, cambiá tu contraseña cuanto antes.',
  ].join('\n')

  return { para, asunto: 'Se inició sesión en tu cuenta de Gym Bro', html, texto }
}
