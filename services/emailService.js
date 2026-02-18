const nodemailer = require('nodemailer');
const { createAdminClient } = require('../supabase/config/supabaseClient');

class EmailService {
  static async getSmtpSettings() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('store_settings')
      .select('smtp_email, smtp_password, smtp_host, smtp_port, smtp_secure, store_name, support_email, logo_url, phone, address, store_email, currency_code')
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

  static formatCurrency(amount, currency = 'USD') {
    if (amount === null || amount === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(Number(amount));
  }

  static formatDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  static buildInvoiceHtml({ order, items, payment, settings }) {
    const storeName = settings?.store_name || 'Your Store';
    const supportEmail = settings?.support_email || settings?.smtp_email || '';
    const logoUrl = settings?.logo_url || '';
    const currency = settings?.currency_code || 'USD';
    const storeAddress = settings?.address || '';
    const storePhone = settings?.phone || '';
    const invoiceNumber = order?.order_code || order?.order_number || order?.id || '';
    const invoiceDate = EmailService.formatDate(order?.created_at) || EmailService.formatDate(new Date());
    const paymentStatus = payment?.status || order?.payment_status || 'Pending';
    const paymentMethod = payment?.method || payment?.payment_method || order?.payment_method || 'Not set';
    const customerName = order?.customer_name || 'Customer';
    const customerEmail = order?.customer_email || '';
    const customerPhone = order?.customer_phone || '';
    const addressLines = [
      order?.address_street,
      order?.address_house,
      order?.address_apartment,
      order?.address_city,
      order?.address_postal_code,
      order?.address_country
    ].filter(Boolean);

    const itemRows = (items || [])
      .map((item) => `
        <tr>
          <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#374151;">${item.product_name || ''}</td>
          <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#6b7280;">${item.variant_name || '-'}</td>
          <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:center; color:#374151;">${item.quantity || 0}</td>
          <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:right; color:#374151;">${EmailService.formatCurrency(item.unit_price, currency)}</td>
          <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:right; color:#111827; font-weight:600;">${EmailService.formatCurrency(item.total_price, currency)}</td>
        </tr>
      `)
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Invoice ${invoiceNumber}</title>
        </head>
        <body style="margin:0; padding:0; background:#ffffff; color:#111827; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:210mm; margin:0 auto; background:#ffffff;">
            
            <!-- Header -->
            <tr>
              <td style="padding:32px 40px; border-bottom:2px solid #111827;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle; width:60%;">
                      ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="height:40px; object-fit:contain;" />` : `<div style="font-size:24px; font-weight:700; color:#111827;">${storeName}</div>`}
                      <div style="margin-top:8px; font-size:13px; color:#6b7280;">${storeAddress || ''}</div>
                      ${storePhone ? `<div style="font-size:13px; color:#6b7280;">${storePhone}</div>` : ''}
                      ${supportEmail ? `<div style="font-size:13px; color:#6b7280;">${supportEmail}</div>` : ''}
                    </td>
                    <td style="text-align:right; vertical-align:middle; width:40%;">
                      <div style="font-size:14px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#6b7280; margin-bottom:4px;">Invoice</div>
                      <div style="font-size:24px; font-weight:700; color:#111827;">#${invoiceNumber}</div>
                      <div style="margin-top:8px; font-size:13px; color:#6b7280;">Date: ${invoiceDate}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Bill To & Details -->
            <tr>
              <td style="padding:32px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                  <tr>
                    <td style="vertical-align:top; width:50%; padding-right:24px;">
                      <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin-bottom:12px;">Bill To</div>
                      <div style="font-size:16px; font-weight:600; color:#111827; margin-bottom:8px;">${customerName}</div>
                      ${customerEmail ? `<div style="font-size:14px; color:#374151; margin-bottom:4px;">${customerEmail}</div>` : ''}
                      ${customerPhone ? `<div style="font-size:14px; color:#374151; margin-bottom:4px;">${customerPhone}</div>` : ''}
                      ${addressLines.length ? `<div style="font-size:14px; color:#6b7280; margin-top:8px; line-height:1.6;">${addressLines.join('<br>')}</div>` : ''}
                    </td>
                    <td style="vertical-align:top; width:50%; padding-left:24px;">
                      <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin-bottom:12px;">Invoice Details</div>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:6px 0; font-size:14px; color:#6b7280;">Payment Status</td>
                          <td style="padding:6px 0; text-align:right; font-size:14px; font-weight:600; color:#111827;">${paymentStatus}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0; font-size:14px; color:#6b7280;">Payment Method</td>
                          <td style="padding:6px 0; text-align:right; font-size:14px; font-weight:600; color:#111827;">${paymentMethod}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Items Table -->
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:24px;">
                  <thead>
                    <tr style="border-bottom:2px solid #111827;">
                      <th align="left" style="padding:12px 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#111827;">Description</th>
                      <th align="left" style="padding:12px 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#111827;">Variant</th>
                      <th align="center" style="padding:12px 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#111827;">Qty</th>
                      <th align="right" style="padding:12px 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#111827;">Unit Price</th>
                      <th align="right" style="padding:12px 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#111827;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows || `<tr><td colspan="5" style="padding:24px; text-align:center; color:#9ca3af;">No items</td></tr>`}
                  </tbody>
                </table>

                <!-- Summary -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:60%;"></td>
                    <td style="width:40%;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #e5e7eb; padding-top:16px;">
                        <tr>
                          <td style="padding:8px 0; font-size:14px; color:#6b7280;">Subtotal</td>
                          <td style="padding:8px 0; text-align:right; font-size:14px; color:#111827;">${EmailService.formatCurrency(order.subtotal, currency)}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0; font-size:14px; color:#6b7280;">Shipping</td>
                          <td style="padding:8px 0; text-align:right; font-size:14px; color:#111827;">${EmailService.formatCurrency(order.shipping_fee, currency)}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0; font-size:14px; color:#6b7280;">Tax</td>
                          <td style="padding:8px 0; text-align:right; font-size:14px; color:#111827;">${EmailService.formatCurrency(order.tax_amount, currency)}</td>
                        </tr>
                        ${order.discount_amount ? `
                        <tr>
                          <td style="padding:8px 0; font-size:14px; color:#6b7280;">Discount</td>
                          <td style="padding:8px 0; text-align:right; font-size:14px; color:#111827;">-${EmailService.formatCurrency(order.discount_amount, currency)}</td>
                        </tr>
                        ` : ''}
                        <tr style="border-top:2px solid #111827;">
                          <td style="padding:12px 0 0; font-size:16px; font-weight:700; color:#111827;">Total Due</td>
                          <td style="padding:12px 0 0; text-align:right; font-size:20px; font-weight:700; color:#111827;">${EmailService.formatCurrency(order.total_amount, currency)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 40px; border-top:2px solid #e5e7eb; background:#f9fafb;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:top; width:50%;">
                      <div style="font-size:13px; font-weight:600; color:#111827; margin-bottom:8px;">${storeName}</div>
                      ${storeAddress ? `<div style="font-size:12px; color:#6b7280; margin-bottom:4px;">${storeAddress}</div>` : ''}
                      ${storePhone ? `<div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Tel: ${storePhone}</div>` : ''}
                      ${supportEmail ? `<div style="font-size:12px; color:#6b7280;">Email: ${supportEmail}</div>` : ''}
                    </td>
                    <td style="text-align:right; vertical-align:top; width:50%;">
                      <div style="font-size:12px; color:#9ca3af; font-style:italic;">Thank you for your business</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  static async buildInvoicePdfBuffer({ order, items, payment, settings }) {
    const ReactModule = await import('react');
    const React = ReactModule.default || ReactModule;
    const renderer = await import('@react-pdf/renderer');
    const { renderToBuffer } = renderer;
    const { createInvoiceDocument } = require('../pdf/InvoiceDocument');
    return renderToBuffer(
      createInvoiceDocument({ React, renderer, order, items, payment, settings })
    );
  }

  static buildOrderEmail({ order, items, payment, settings }) {
    const storeName = settings?.store_name || 'Your Store';
    const supportEmail = settings?.support_email || settings?.smtp_email || '';
    const logoUrl = settings?.logo_url || '';
    const currency = settings?.currency_code || 'USD';
    const storeAddress = settings?.address || '';
    const storePhone = settings?.phone || '';
    const orderNumber = order?.order_code || order?.order_number || order?.id || '';
    const orderDate = EmailService.formatDate(order?.created_at);
    const paymentStatus = payment?.status || order?.payment_status || 'Pending';
    const paymentMethod = payment?.method || payment?.payment_method || order?.payment_method || 'Not set';
    const customerName = order?.customer_name || 'Customer';
    
    const itemRows = (items || [])
      .map((item) => `
        <tr>
          <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:600; color:#111827;">${item.product_name || ''}</div>
            <div style="font-size:13px; color:#6b7280; margin-top:2px;">${item.variant_name || '-'}</div>
          </td>
          <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:center; font-weight:600; color:#374151;">${item.quantity || 0}</td>
          <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:600; color:#111827;">${EmailService.formatCurrency(item.total_price, currency)}</td>
        </tr>
      `)
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="margin:0; padding:0; background:#f9fafb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; padding:32px 0;">
            <tr>
              <td align="center">
                <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff; border:1px solid #e5e7eb;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding:32px 40px; border-bottom:2px solid #111827;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align:middle;">
                            ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="height:36px; object-fit:contain;" />` : `<div style="font-size:20px; font-weight:700; color:#111827;">${storeName}</div>`}
                          </td>
                          <td style="text-align:right; vertical-align:middle;">
                            <div style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#6b7280;">Order Confirmation</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding:32px 40px;">
                      <h2 style="margin:0 0 8px; font-size:24px; font-weight:700; color:#111827;">Thank you for your order!</h2>
                      <p style="margin:0 0 24px; font-size:14px; color:#6b7280;">Hi ${customerName}, we've received your order and will process it shortly.</p>

                      <!-- Order Info -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; background:#f9fafb; border:1px solid #e5e7eb;">
                        <tr>
                          <td style="padding:16px 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="width:50%; vertical-align:top;">
                                  <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin-bottom:4px;">Order Number</div>
                                  <div style="font-size:18px; font-weight:700; color:#111827;">#${orderNumber}</div>
                                </td>
                                <td style="width:50%; vertical-align:top; text-align:right;">
                                  <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin-bottom:4px;">Order Date</div>
                                  <div style="font-size:14px; font-weight:600; color:#111827;">${orderDate || 'N/A'}</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Payment Info -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                        <tr>
                          <td style="padding:12px 0; border-bottom:1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="font-size:14px; color:#6b7280;">Payment Method</td>
                                <td style="text-align:right; font-size:14px; font-weight:600; color:#111827;">${paymentMethod}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="font-size:14px; color:#6b7280;">Payment Status</td>
                                <td style="text-align:right; font-size:14px; font-weight:600; color:#111827;">${paymentStatus}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Items Table -->
                      <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin-bottom:12px;">Order Items</div>
                      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #e5e7eb; margin-bottom:24px;">
                        <thead>
                          <tr style="background:#f9fafb; border-bottom:2px solid #e5e7eb;">
                            <th align="left" style="padding:12px 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#111827;">Item</th>
                            <th align="center" style="padding:12px 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#111827;">Qty</th>
                            <th align="right" style="padding:12px 16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#111827;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemRows || `<tr><td colspan="3" style="padding:24px; text-align:center; color:#9ca3af;">No items</td></tr>`}
                        </tbody>
                      </table>

                      <!-- Summary -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:55%;"></td>
                          <td style="width:45%;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #e5e7eb; padding-top:12px;">
                              <tr>
                                <td style="padding:8px 0; font-size:14px; color:#6b7280;">Subtotal</td>
                                <td style="padding:8px 0; text-align:right; font-size:14px; color:#111827;">${EmailService.formatCurrency(order.subtotal, currency)}</td>
                              </tr>
                              <tr>
                                <td style="padding:8px 0; font-size:14px; color:#6b7280;">Shipping</td>
                                <td style="padding:8px 0; text-align:right; font-size:14px; color:#111827;">${EmailService.formatCurrency(order.shipping_fee, currency)}</td>
                              </tr>
                              <tr>
                                <td style="padding:8px 0; font-size:14px; color:#6b7280;">Tax</td>
                                <td style="padding:8px 0; text-align:right; font-size:14px; color:#111827;">${EmailService.formatCurrency(order.tax_amount, currency)}</td>
                              </tr>
                              ${order.discount_amount ? `
                              <tr>
                                <td style="padding:8px 0; font-size:14px; color:#6b7280;">Discount</td>
                                <td style="padding:8px 0; text-align:right; font-size:14px; color:#111827;">-${EmailService.formatCurrency(order.discount_amount, currency)}</td>
                              </tr>
                              ` : ''}
                              <tr style="border-top:2px solid #111827;">
                                <td style="padding:12px 0 0; font-size:16px; font-weight:700; color:#111827;">Total</td>
                                <td style="padding:12px 0 0; text-align:right; font-size:18px; font-weight:700; color:#111827;">${EmailService.formatCurrency(order.total_amount, currency)}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:24px 40px; border-top:2px solid #e5e7eb; background:#f9fafb;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align:top; width:50%;">
                            <div style="font-size:13px; font-weight:600; color:#111827; margin-bottom:8px;">${storeName}</div>
                            ${storeAddress ? `<div style="font-size:12px; color:#6b7280; margin-bottom:4px;">${storeAddress}</div>` : ''}
                            ${storePhone ? `<div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Tel: ${storePhone}</div>` : ''}
                            ${supportEmail ? `<div style="font-size:12px; color:#6b7280;">Email: ${supportEmail}</div>` : ''}
                          </td>
                          <td style="text-align:right; vertical-align:top; width:50%;">
                            <div style="font-size:12px; color:#9ca3af; font-style:italic;">Thank you for your business</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  static buildOrderCancellationEmail({ order, settings }) {
    const storeName = settings?.store_name || 'Your Store';
    const supportEmail = settings?.support_email || settings?.smtp_email || '';
    const logoUrl = settings?.logo_url || '';
    const orderNumber = order?.order_code || order?.order_number || order?.id || '';
    const customerName = order?.customer_name || 'Customer';

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="margin:0; padding:0; background:#f9fafb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; padding:32px 0;">
            <tr>
              <td align="center">
                <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff; border:1px solid #e5e7eb;">
                  
                  <tr>
                    <td style="padding:32px 40px; border-bottom:2px solid #111827;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align:middle;">
                            ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="height:36px; object-fit:contain;" />` : `<div style="font-size:20px; font-weight:700; color:#111827;">${storeName}</div>`}
                          </td>
                          <td style="text-align:right; vertical-align:middle;">
                            <div style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#6b7280;">Order Cancelled</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:32px 40px;">
                      <h2 style="margin:0 0 8px; font-size:24px; font-weight:700; color:#111827;">Your order was cancelled</h2>
                      <p style="margin:0 0 20px; font-size:14px; color:#6b7280;">Hi ${customerName}, your order has been cancelled. If you have questions, please contact us.</p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border:1px solid #e5e7eb;">
                        <tr>
                          <td style="padding:16px 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="width:50%; vertical-align:top;">
                                  <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin-bottom:4px;">Order Number</div>
                                  <div style="font-size:18px; font-weight:700; color:#111827;">#${orderNumber}</div>
                                </td>
                                <td style="width:50%; vertical-align:top; text-align:right;">
                                  <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin-bottom:4px;">Status</div>
                                  <div style="font-size:14px; font-weight:600; color:#111827;">Cancelled</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      ${supportEmail ? `<p style="margin:20px 0 0; font-size:13px; color:#6b7280;">Support: ${supportEmail}</p>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  static async sendOrderConfirmation({ order, items, payment, includeInvoicePdf = false }) {
    const settings = await EmailService.getSmtpSettings();
    const transport = EmailService.buildTransport(settings);
    if (!transport) return { skipped: true, reason: 'SMTP not configured' };

    const fromName = settings?.store_name || 'Store';
    const fromEmail = settings?.smtp_email;
    const toEmail = order?.customer_email;
    if (!toEmail) return { skipped: true, reason: 'Missing customer email' };

    const html = EmailService.buildOrderEmail({ order, items, payment, settings });
    const mail = {
      from: `${fromName} <${fromEmail}>`,
      to: toEmail,
      subject: `Order confirmation ${order.order_code || order.order_number}`,
      html
    };

    if (includeInvoicePdf) {
      const invoicePdf = await EmailService.buildInvoicePdfBuffer({ order, items, payment, settings });
      const invoiceNumber = order?.order_code || order?.order_number || order?.id || 'invoice';
      mail.attachments = [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: invoicePdf,
          contentType: 'application/pdf'
        }
      ];
    }

    await transport.sendMail(mail);

    return { sent: true };
  }

  static async sendOrderCancellation({ order }) {
    const settings = await EmailService.getSmtpSettings();
    const transport = EmailService.buildTransport(settings);
    if (!transport) return { skipped: true, reason: 'SMTP not configured' };

    const fromName = settings?.store_name || 'Store';
    const fromEmail = settings?.smtp_email;
    const toEmail = order?.customer_email;
    if (!toEmail) return { skipped: true, reason: 'Missing customer email' };

    const html = EmailService.buildOrderCancellationEmail({ order, settings });
    const mail = {
      from: `${fromName} <${fromEmail}>`,
      to: toEmail,
      subject: `Order cancelled ${order.order_code || order.order_number}`,
      html
    };

    await transport.sendMail(mail);
    return { sent: true };
  }
}

module.exports = { EmailService };
