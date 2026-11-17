import { Inject, Injectable, Logger } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTransport, type Transporter } from 'nodemailer';
import { BRAND } from '@derslik/shared';
import { CONFIG, type AppConfig } from '../config';

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Teknik e-postalar (doğrulama, şifre sıfırlama). Bildirim merkezinden ayrıdır.
 * `MAIL_MODE=smtp`: gerçek gönderim (ör. Gmail + uygulama şifresi). Geliştirmede konsola veya `.mail/` klasörüne yazar.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  /** Testlerin son gönderilen e-postaları okuyabilmesi için. */
  readonly outbox: OutgoingMail[] = [];
  private transport: Transporter | null = null;

  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  async send(mail: OutgoingMail): Promise<void> {
    if (this.config.NODE_ENV === 'test') {
      this.outbox.push(mail);
      return;
    }
    if (this.config.MAIL_MODE === 'smtp') {
      this.transport ??= createTransport({
        host: this.config.SMTP_HOST,
        port: this.config.SMTP_PORT,
        secure: this.config.SMTP_PORT === 465,
        auth: { user: this.config.SMTP_USER!, pass: this.config.SMTP_PASS!.replace(/\s+/g, '') },
      });
      await this.transport.sendMail({
        from: { name: BRAND.name, address: this.config.MAIL_FROM ?? this.config.SMTP_USER! },
        to: mail.to,
        subject: `${BRAND.name}: ${mail.subject}`,
        text: mail.text,
      });
      return;
    }
    if (this.config.MAIL_MODE === 'file') {
      const dir = join(process.cwd(), '.mail');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${Date.now()}-${mail.subject.replace(/\W+/g, '_')}.txt`), `To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`);
      return;
    }
    this.logger.log(`[geliştirme e-postası] ${mail.subject}\n${mail.text}`);
  }
}
