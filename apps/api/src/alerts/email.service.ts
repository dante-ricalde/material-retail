import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // PreviewTransport: writes the email as an .eml file under `data/outbox/`.
    // Easy to demo; easy to swap for real SMTP later.
    this.transporter = nodemailer.createTransport({
      jsonTransport: true,
    });

    // Override `sendMail` to also persist the EML into our outbox folder.
    const send = this.transporter.sendMail.bind(this.transporter);
    this.transporter.sendMail = async (options: nodemailer.SendMailOptions) => {
      const result = await send(options);
      try {
        const outboxDir = this.outboxDir();
        fs.mkdirSync(outboxDir, { recursive: true });
        const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}_${(options.subject ?? 'message').replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}.eml`;
        const emlPath = path.join(outboxDir, filename);

        // jsonTransport gives us result.message (JSON), but for a more useful EML file,
        // rebuild a basic RFC822 message from the options.
        const headers: string[] = [];
        headers.push(`Date: ${new Date().toUTCString()}`);
        headers.push(`From: ${process.env.ALERT_FROM ?? 'Material Retail <alerts@material-retail.local>'}`);
        if (options.to) headers.push(`To: ${options.to}`);
        if (options.subject) headers.push(`Subject: ${options.subject}`);
        headers.push('MIME-Version: 1.0');

        let body: string;
        let contentType = 'text/plain; charset=utf-8';
        if (typeof options.html === 'string') {
          contentType = 'text/html; charset=utf-8';
          headers.push(`Content-Type: ${contentType}`);
          body = options.html;
        } else if (typeof options.text === 'string') {
          headers.push(`Content-Type: ${contentType}`);
          body = options.text;
        } else {
          headers.push(`Content-Type: ${contentType}`);
          body = '';
        }

        const eml = `${headers.join('\r\n')}\r\n\r\n${body}\r\n`;
        fs.writeFileSync(emlPath, eml, 'utf8');
        return { ...result, envelope: result.envelope ?? { from: '', to: [] }, messageId: filename };
      } catch (err) {
        // Surface but don't fail the request — alert persistence + email are independent.
        // eslint-disable-next-line no-console
        console.error('Failed to write EML to outbox:', (err as Error).message);
        return result;
      }
    };
  }

  /** Returns absolute path to repo/data/outbox. */
  outboxDir(): string {
    // apps/api/src/alerts → apps/api → apps → repoRoot → data/outbox
    const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
    return path.join(repoRoot, 'data', 'outbox');
  }

  async sendLowStockAlert(opts: {
    to: string;
    merchantName: string;
    productLink: string;
    summary: string;
    stockQty: number;
    threshold: number;
    alertId: string;
  }): Promise<string> {
    const subject = `Reorder soon: ${opts.productLink}`;
    const text = [
      `Hi ${opts.merchantName},`,
      '',
      `One of your products is running low and needs to be reordered.`,
      '',
      `Product: ${opts.productLink}`,
      `Variant: ${opts.summary}`,
      `Current stock: ${opts.stockQty}`,
      `Reorder threshold: ${opts.threshold}`,
      '',
      `Order from your supplier soon to avoid running out.`,
      '',
      `— Material Retail alerts`,
      `(alert id: ${opts.alertId})`,
    ].join('\n');

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
        <h2 style="margin:0 0 16px;color:#b91c1c">⏰ Time to reorder: ${escapeHtml(opts.productLink)}</h2>
        <p>Hi ${escapeHtml(opts.merchantName)},</p>
        <p>This product is at or below its reorder threshold.</p>
        <table cellpadding="8" style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr style="background:#f4f4f5"><td align="right"><b>Variant</b></td><td>${escapeHtml(opts.summary)}</td></tr>
          <tr><td align="right"><b>Current stock</b></td><td><b>${opts.stockQty}</b></td></tr>
          <tr style="background:#f4f4f5"><td align="right"><b>Threshold</b></td><td>${opts.threshold}</td></tr>
        </table>
        <p>Order from your supplier soon so you don't run out.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="font-size:12px;color:#6b7280">Material Retail alerts &middot; alert id ${escapeHtml(opts.alertId)}</p>
      </div>`;

    const result = await this.transporter.sendMail({
      from: process.env.ALERT_FROM ?? 'Material Retail <alerts@material-retail.local>',
      to: opts.to,
      subject,
      text,
      html,
    });
    return String(result?.messageId ?? '');
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
