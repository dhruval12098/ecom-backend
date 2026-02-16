const styles = {
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
    paddingTop: 64,
    paddingHorizontal: 40,
    paddingBottom: 40,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 16,
    marginBottom: 20
  },
  brandBlock: {
    width: '60%'
  },
  logo: {
    height: 32,
    objectFit: 'contain'
  },
  logoWrap: {
    width: 120,
    alignItems: 'flex-start'
  },
  storeName: {
    fontSize: 18,
    fontWeight: 700
  },
  muted: {
    color: '#6b7280'
  },
  invoiceBlock: {
    width: '40%',
    textAlign: 'right'
  },
  invoiceLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 4
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: 700
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 8
  },
  sectionRule: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginTop: 6,
    marginBottom: 10
  },
  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  col: {
    width: '48%'
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 6
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  th: {
    padding: 8,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 700
  },
  td: {
    padding: 8
  },
  cellDesc: { width: '40%' },
  cellVar: { width: '20%' },
  cellQty: { width: '10%', textAlign: 'center' },
  cellUnit: { width: '15%', textAlign: 'right' },
  cellTotal: { width: '15%', textAlign: 'right' },
  summaryWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  summary: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#111827',
    marginTop: 6,
    paddingTop: 6
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#6b7280'
  },
  strong: {
    fontWeight: 700
  },
  invoiceCode: {
    fontSize: 16,
    fontWeight: 700
  },
  invoiceDate: {
    fontSize: 9,
    color: '#6b7280'
  }
};

function formatCurrency(amount, currency) {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(Number(amount));
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function createInvoiceDocument({ React, renderer, order, items, payment, settings }) {
  const { Document, Page, Text, View, StyleSheet, Image } = renderer;
  const reactPdfStyles = StyleSheet.create(styles);

  const storeName = settings?.store_name || 'Your Store';
  const supportEmail = settings?.support_email || settings?.smtp_email || '';
  const logoUrl = settings?.logo_url || '';
  const currency = settings?.currency_code || 'USD';
  const storeAddress = settings?.address || '';
  const storePhone = settings?.phone || '';
  const invoiceNumber = order?.order_code || order?.order_number || order?.id || '';
  const invoiceDate = formatDate(order?.created_at) || formatDate(new Date());
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

  const itemRows = (items || []).length ? items : [];

  return (
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: 'A4', style: reactPdfStyles.page },
        React.createElement(
          View,
          { style: reactPdfStyles.header },
          React.createElement(
            View,
            { style: reactPdfStyles.brandBlock },
            logoUrl
              ? React.createElement(
                  View,
                  { style: reactPdfStyles.logoWrap },
                  React.createElement(Image, { src: logoUrl, style: reactPdfStyles.logo })
                )
              : React.createElement(Text, { style: reactPdfStyles.storeName }, storeName),
            storeName && logoUrl ? React.createElement(Text, { style: reactPdfStyles.storeName }, storeName) : null,
            storeAddress ? React.createElement(Text, { style: reactPdfStyles.muted }, storeAddress) : null,
            storePhone ? React.createElement(Text, { style: reactPdfStyles.muted }, storePhone) : null,
            supportEmail ? React.createElement(Text, { style: reactPdfStyles.muted }, supportEmail) : null
          ),
          React.createElement(
            View,
            { style: reactPdfStyles.invoiceBlock },
            React.createElement(Text, { style: reactPdfStyles.invoiceLabel }, 'Invoice'),
            React.createElement(Text, { style: reactPdfStyles.invoiceCode }, `#${invoiceNumber}`),
            React.createElement(Text, { style: reactPdfStyles.invoiceDate }, `Date: ${invoiceDate}`)
          )
        ),

        React.createElement(
          View,
          { style: [reactPdfStyles.section, reactPdfStyles.twoCol] },
          React.createElement(
            View,
            { style: [reactPdfStyles.col, reactPdfStyles.infoCard] },
            React.createElement(Text, { style: reactPdfStyles.sectionTitle }, 'Bill To'),
            React.createElement(View, { style: reactPdfStyles.sectionRule }),
            React.createElement(Text, { style: reactPdfStyles.strong }, customerName),
            customerEmail ? React.createElement(Text, { style: reactPdfStyles.muted }, customerEmail) : null,
            customerPhone ? React.createElement(Text, { style: reactPdfStyles.muted }, customerPhone) : null,
            addressLines.length
              ? React.createElement(Text, { style: reactPdfStyles.muted }, addressLines.join(', '))
              : null
          ),
          React.createElement(
            View,
            { style: [reactPdfStyles.col, reactPdfStyles.infoCard] },
            React.createElement(Text, { style: reactPdfStyles.sectionTitle }, 'Invoice Details'),
            React.createElement(View, { style: reactPdfStyles.sectionRule }),
            React.createElement(
              View,
              { style: reactPdfStyles.summaryRow },
              React.createElement(Text, { style: reactPdfStyles.muted }, 'Payment Status'),
              React.createElement(Text, { style: reactPdfStyles.strong }, paymentStatus)
            ),
            React.createElement(
              View,
              { style: reactPdfStyles.summaryRow },
              React.createElement(Text, { style: reactPdfStyles.muted }, 'Payment Method'),
              React.createElement(Text, { style: reactPdfStyles.strong }, paymentMethod)
            )
          )
        ),

        React.createElement(Text, { style: reactPdfStyles.sectionTitle }, 'Items'),
        React.createElement(
          View,
          { style: reactPdfStyles.table },
          React.createElement(
            View,
            { style: reactPdfStyles.tableHeader },
            React.createElement(Text, { style: [reactPdfStyles.th, reactPdfStyles.cellDesc] }, 'Description'),
            React.createElement(Text, { style: [reactPdfStyles.th, reactPdfStyles.cellVar] }, 'Variant'),
            React.createElement(Text, { style: [reactPdfStyles.th, reactPdfStyles.cellQty] }, 'Qty'),
            React.createElement(Text, { style: [reactPdfStyles.th, reactPdfStyles.cellUnit] }, 'Unit Price'),
            React.createElement(Text, { style: [reactPdfStyles.th, reactPdfStyles.cellTotal] }, 'Amount')
          ),
          itemRows.length
            ? itemRows.map((item, idx) =>
                React.createElement(
                  View,
                  { style: reactPdfStyles.tableRow, key: `${item.id || idx}` },
                  React.createElement(Text, { style: [reactPdfStyles.td, reactPdfStyles.cellDesc] }, item.product_name || ''),
                  React.createElement(Text, { style: [reactPdfStyles.td, reactPdfStyles.cellVar] }, item.variant_name || '-'),
                  React.createElement(Text, { style: [reactPdfStyles.td, reactPdfStyles.cellQty] }, String(item.quantity || 0)),
                  React.createElement(Text, { style: [reactPdfStyles.td, reactPdfStyles.cellUnit] }, formatCurrency(item.unit_price, currency)),
                  React.createElement(Text, { style: [reactPdfStyles.td, reactPdfStyles.cellTotal] }, formatCurrency(item.total_price, currency))
                )
              )
            : React.createElement(
                View,
                { style: reactPdfStyles.tableRow },
                React.createElement(Text, { style: reactPdfStyles.td }, 'No items')
              )
        ),

        React.createElement(
          View,
          { style: reactPdfStyles.summaryWrap },
          React.createElement(
            View,
            { style: reactPdfStyles.summary },
            React.createElement(
              View,
              { style: reactPdfStyles.summaryRow },
              React.createElement(Text, { style: reactPdfStyles.muted }, 'Subtotal'),
              React.createElement(Text, null, formatCurrency(order.subtotal, currency))
            ),
            React.createElement(
              View,
              { style: reactPdfStyles.summaryRow },
              React.createElement(Text, { style: reactPdfStyles.muted }, 'Shipping'),
              React.createElement(Text, null, formatCurrency(order.shipping_fee, currency))
            ),
            React.createElement(
              View,
              { style: reactPdfStyles.summaryRow },
              React.createElement(Text, { style: reactPdfStyles.muted }, 'Tax'),
              React.createElement(Text, null, formatCurrency(order.tax_amount, currency))
            ),
            order.discount_amount
              ? React.createElement(
                  View,
                  { style: reactPdfStyles.summaryRow },
                  React.createElement(Text, { style: reactPdfStyles.muted }, 'Discount'),
                  React.createElement(Text, null, `-${formatCurrency(order.discount_amount, currency)}`)
                )
              : null,
            React.createElement(
              View,
              { style: [reactPdfStyles.summaryRow, reactPdfStyles.totalRow] },
              React.createElement(Text, { style: reactPdfStyles.strong }, 'Total Due'),
              React.createElement(Text, { style: reactPdfStyles.strong }, formatCurrency(order.total_amount, currency))
            )
          )
        ),

        React.createElement(
          View,
          { style: reactPdfStyles.footer },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: reactPdfStyles.strong }, storeName),
            storeAddress ? React.createElement(Text, null, storeAddress) : null,
            storePhone ? React.createElement(Text, null, `Tel: ${storePhone}`) : null,
            supportEmail ? React.createElement(Text, null, `Email: ${supportEmail}`) : null
          ),
          React.createElement(Text, { style: reactPdfStyles.muted }, 'Thank you for your business')
        )
      )
    )
  );
}
module.exports = { createInvoiceDocument };
