import { Resend } from 'resend'
import type { CorreoSaliente, EnviadorCorreo } from '../auth/puertos'
import { entorno } from '../entorno'

/**
 * Envío real de correo a través de Resend.
 *
 * Un fallo al mandar el correo se propaga: si el código no sale, el endpoint
 * debe enterarse y responder en consecuencia. Decirle al usuario "te mandamos
 * un código" cuando no salió lo deja esperando algo que nunca llega.
 */
export class EnviadorResend implements EnviadorCorreo {
  private cliente: Resend | null = null

  private get api(): Resend {
    if (!this.cliente) this.cliente = new Resend(entorno().resendApiKey)
    return this.cliente
  }

  async enviar(correo: CorreoSaliente): Promise<void> {
    const { error } = await this.api.emails.send({
      from: entorno().correoRemitente,
      to: correo.para,
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
    })
    // El SDK devuelve el error en la respuesta en vez de lanzarlo.
    if (error) throw new Error(`Resend rechazó el envío: ${error.message ?? 'motivo desconocido'}`)
  }
}

/** Enviador que solo registra, para desarrollo sin clave de Resend. */
export class EnviadorConsola implements EnviadorCorreo {
  async enviar(correo: CorreoSaliente): Promise<void> {
    console.info(`[correo] para=${correo.para} asunto=${correo.asunto}\n${correo.texto}`)
  }
}
