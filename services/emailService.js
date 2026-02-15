const nodemailer = require('nodemailer');
const { createAdminClient } = require('../supabase/config/supabaseClient');

class EmailService {
  static async getSmtpSettings() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('store_settings')
      .select('smtp_email, smtp_password, smtp_host, smtp_port, smtp_secure, store_name, support_email, logo_url')
      .eq('id', 1)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || null;
  }

  static buildTransport(settings) {
    if (!settings) return null;
    const host = settings.smtp_host;
    const port = settings.smtp_port;
    const user = settings.smtp_email;
    const pass = settings.smtp_password;
    if (!host || !port || !user || !pass) return null;

    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Boolean(settings.smtp_secure),
      auth: { user, pass }
    });
  }

  static formatCurrency(amount) {
    if (amount === null || amount === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(amount));
  }

  static buildOrderEmail({ order, items, payment, settings }) {
    const storeName = settings?.store_name || 'Your Store';
    const supportEmail = settings?.support_email || settings?.smtp_email || '';
    const logoUrl = settings?.logo_url || '';
    const itemRows = (items || [])
      .map((item) => `
        <tr>
          <td style="padding:8px 4px;">${item.product_name || ''}</td>
          <td style="padding:8px 4px;">${item.variant_name || '-'}</td>
          <td style="padding:8px 4px; text-align:center;">${item.quantity || 0}</td>
          <td style="padding:8px 4px; text-align:right;">${EmailService.formatCurrency(item.total_price)}</td>
        </tr>
      `)
      .join('');

    return `
      <div style="font-family:Arial, sans-serif; color:#111;">
        ${logoUrl ? `<div style="margin-bottom:16px;"><img src="${logoUrl}" alt="${storeName}" style="height:48px; object-fit:contain;" /></div>` : ''}
        <h2 style="margin-bottom:8px;">Thanks for your order!</h2>
        <p style="margin:0 0 12px;">Order <strong>${order.order_code || order.order_number}</strong></p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr>
              <th align="left" style="border-bottom:1px solid #ddd; padding:8px 4px;">Item</th>
              <th align="left" style="border-bottom:1px solid #ddd; padding:8px 4px;">Variant</th>
              <th align="center" style="border-bottom:1px solid #ddd; padding:8px 4px;">Qty</th>
              <th align="right" style="border-bottom:1px solid #ddd; padding:8px 4px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        <div style="margin-top:12px;">
          <p style="margin:4px 0;">Subtotal: ${EmailService.formatCurrency(order.subtotal)}</p>
          <p style="margin:4px 0;">Shipping: ${EmailService.formatCurrency(order.shipping_fee)}</p>
          <p style="margin:4px 0;">Tax: ${EmailService.formatCurrency(order.tax_amount)}</p>
          <p style="margin:4px 0;">Discount: ${EmailService.formatCurrency(order.discount_amount)}</p>
          <p style="margin:8px 0; font-weight:bold;">Total: ${EmailService.formatCurrency(order.total_amount)}</p>
        </div>
        ${supportEmail ? `<p style="margin-top:16px;">Need help? Contact us at ${supportEmail}</p>` : ''}
        <p style="margin-top:24px; font-size:12px; color:#555;">${storeName}</p>
      </div>
    `;
  }

  static async sendOrderConfirmation({ order, items, payment }) {
    const settings = await EmailService.getSmtpSettings();
    const transport = EmailService.buildTransport(settings);
    if (!transport) return { skipped: true, reason: 'SMTP not configured' };

    const fromName = settings?.store_name || 'Store';
    const fromEmail = settings?.smtp_email;
    const toEmail = order?.customer_email;
    if (!toEmail) return { skipped: true, reason: 'Missing customer email' };

    const html = EmailService.buildOrderEmail({ order, items, payment, settings });
    await transport.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: toEmail,
      subject: `Order confirmation ${order.order_code || order.order_number}`,
      html
    });

    return { sent: true };
  }
}

module.exports = { EmailService };
