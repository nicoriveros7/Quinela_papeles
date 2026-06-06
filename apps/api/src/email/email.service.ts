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
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Restablece tu contraseña</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0D0D0D;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       bgcolor="#0D0D0D" style="background-color:#0D0D0D;padding:40px 16px;">
  <tr>
    <td align="center" valign="top">

      <!-- Container: max 600px -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="max-width:600px;width:100%;">

        <!-- ── HEADER ─────────────────────────────────────────────── -->
        <tr>
          <td align="center" bgcolor="#1F1F1F" valign="top"
              style="background-color:#1F1F1F;border-radius:12px 12px 0 0;
                     border-top:3px solid #D7FF19;
                     border-left:1px solid #333333;border-right:1px solid #333333;
                     padding:32px 40px 28px;">

            <!-- App name -->
            <p style="margin:0 0 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                      font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#D7FF19;">
              La Polla de Papeles
            </p>
            <!-- Sub -->
            <p style="margin:0 0 20px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                      font-size:11px;font-weight:500;letter-spacing:0.10em;text-transform:uppercase;color:#A3A3A3;">
              Mundial 2026
            </p>

            <!-- Divider -->
            <table width="40" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 auto 20px;">
              <tr>
                <td height="2" bgcolor="#D7FF19" style="background-color:#D7FF19;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>

            <!-- Title -->
            <h1 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                       font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.02em;line-height:1.2;">
              Restablece tu contrase&#241;a
            </h1>
          </td>
        </tr>

        <!-- ── BODY ───────────────────────────────────────────────── -->
        <tr>
          <td bgcolor="#1F1F1F" valign="top"
              style="background-color:#1F1F1F;padding:36px 40px 32px;
                     border-left:1px solid #333333;border-right:1px solid #333333;">

            <!-- Greeting -->
            <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                      font-size:16px;font-weight:700;color:#FFFFFF;line-height:1.4;">
              Hola, ${firstName}
            </p>
            <!-- Body copy -->
            <p style="margin:0 0 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                      font-size:15px;line-height:1.65;color:#A3A3A3;">
              Recibimos una solicitud para restablecer la contrase&#241;a de tu cuenta.
              Haz clic en el bot&#243;n de abajo para crear una nueva.
            </p>

            <!-- ── CTA BUTTON ──────────────────────────────────────── -->
            <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:32px;">
              <tr>
                <td align="center" bgcolor="#D7FF19"
                    style="background-color:#D7FF19;border-radius:8px;mso-padding-alt:0;">
                  <a href="${resetUrl}" target="_blank"
                     style="display:inline-block;padding:14px 36px;
                            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                            font-size:15px;font-weight:800;color:#0D0D0D;text-decoration:none;
                            border-radius:8px;letter-spacing:0.01em;line-height:1;">
                    Restablecer contrase&#241;a
                  </a>
                </td>
              </tr>
            </table>

            <!-- ── LINK FALLBACK ──────────────────────────────────── -->
            <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                      font-size:12px;color:#A3A3A3;">
              Si el bot&#243;n no funciona, copia este enlace en tu navegador:
            </p>
            <p style="margin:0 0 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                      font-size:12px;word-break:break-all;line-height:1.5;">
              <a href="${resetUrl}" style="color:#D7FF19;text-decoration:underline;">${resetUrl}</a>
            </p>

            <!-- ── DIVIDER ─────────────────────────────────────────── -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
                   style="margin-bottom:24px;">
              <tr>
                <td height="1" bgcolor="#333333" style="background-color:#333333;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>

            <!-- ── INFO BOX ───────────────────────────────────────── -->
            <table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%">
              <tr>
                <td bgcolor="#161616" valign="top"
                    style="background-color:#161616;border:1px solid #333333;
                           border-left:3px solid #D7FF19;border-radius:6px;
                           padding:16px 20px;">
                  <p style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                            font-size:13px;color:#A3A3A3;line-height:1.55;">
                    <span style="color:#FFFFFF;font-weight:700;">&#9201; Este enlace expira en 60 minutos.</span>
                    Despu&#233;s de ese tiempo tendr&#225;s que solicitar uno nuevo.
                  </p>
                  <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                            font-size:13px;color:#A3A3A3;line-height:1.55;">
                    Si no solicitaste este cambio, puedes ignorar este correo.
                    Tu contrase&#241;a permanecer&#225; sin cambios.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ── FOOTER ────────────────────────────────────────────── -->
        <tr>
          <td align="center" bgcolor="#161616" valign="top"
              style="background-color:#161616;border-radius:0 0 12px 12px;
                     border:1px solid #333333;border-top:none;
                     padding:20px 40px;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                      font-size:12px;color:#A3A3A3;line-height:1.5;">
              La Polla de Papeles &nbsp;&middot;&nbsp; Correo autom&#225;tico
            </p>
          </td>
        </tr>

      </table>
      <!-- /Container -->

    </td>
  </tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>`;
  }
}
