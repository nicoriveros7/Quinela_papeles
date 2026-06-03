import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly webAppUrl: string;
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('PASSWORD_RESET_FROM_EMAIL') ?? 'noreply@example.com';
    this.webAppUrl =
      this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
    this.isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else if (!this.isDev) {
      throw new Error('RESEND_API_KEY is required in production');
    } else {
      this.resend = null;
    }
  }

  async sendPasswordResetEmail(toEmail: string, token: string, displayName: string): Promise<void> {
    const resetUrl = `${this.webAppUrl}/reset-password?token=${token}`;

    if (!this.resend) {
      this.logger.warn(`[DEV] Password reset link for ${toEmail}: ${resetUrl}`);
      return;
    }

    await this.resend.emails.send({
      from: this.fromEmail,
      to: toEmail,
      subject: 'Restablece tu contraseña — Quiniela Mundial 2026',
      html: this.buildResetEmailHtml(resetUrl, displayName),
    });
  }

  private buildResetEmailHtml(resetUrl: string, displayName: string): string {
    const firstName = displayName.split(' ')[0];

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restablece tu contraseña</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 60%,#2563eb 100%);border-radius:16px 16px 0 0;padding:32px 32px 28px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.65);">
                Quiniela Mundial 2026
              </p>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">
                Restablece tu contraseña
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 32px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

              <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#0f172a;">
                Hola, ${firstName}
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#475569;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                Haz clic en el botón de abajo para crear una nueva.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                <tr>
                  <td style="border-radius:10px;background:#1d4ed8;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.01em;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
                Si el botón no funciona, copia este enlace en tu navegador:
              </p>
              <p style="margin:0 0 28px;font-size:12px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#2563eb;text-decoration:none;">${resetUrl}</a>
              </p>

              <hr style="margin:0 0 24px;border:none;border-top:1px solid #f1f5f9;" />

              <!-- Warnings -->
              <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                  <td style="background:#f8fafc;border-left:3px solid #e2e8f0;border-radius:0 6px 6px 0;padding:12px 16px;">
                    <p style="margin:0 0 6px;font-size:13px;color:#64748b;line-height:1.5;">
                      <strong style="color:#475569;">Expira en 60 minutos.</strong>
                      Después de ese tiempo necesitarás solicitar un nuevo enlace.
                    </p>
                    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
                      Si no solicitaste este cambio, puedes ignorar este correo.
                      Tu contraseña permanecerá sin cambios.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 32px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Quiniela Mundial 2026 &mdash; Este es un correo automático, no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
  }
}
