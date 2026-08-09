import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getDB } from '../database/sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const pdfService = {
  generateInvoiceHtml: (shopName, invoice, items, userDetails = {}, customerPhone = '', layoutDetails = {}) => {
    const headerSub = layoutDetails.headerSub || 'Invoice / Bill Summary';
    const footerMsg = layoutDetails.footerMsg || 'Thank you for your business!';
    const showSign = layoutDetails.showSign !== undefined ? layoutDetails.showSign : true;
    const address = layoutDetails.address || '123 Silicon Valley Road, Bangalore - 560001';
    const gstin = layoutDetails.gstin || '22AAAAA0000A1Z5';
    const logoImage = layoutDetails.logoImage || null;
    const instagram = layoutDetails.instagram || '';
    const gmail = layoutDetails.gmail || '';
    const contactNumber = layoutDetails.contactNumber || '';

    const invoiceDate = new Date(invoice.created_at);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(invoiceDate.getDate()).padStart(2, '0');
    const month = months[invoiceDate.getMonth()];
    const year = invoiceDate.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    let hours = invoiceDate.getHours();
    const minutes = String(invoiceDate.getMinutes()).padStart(2, '0');
    const seconds = String(invoiceDate.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    const timeStr = `${hoursStr}:${minutes}:${seconds}${ampm}`;

    const subtotal = Number(invoice.subtotal) || 0;
    const discountAmount = Number(invoice.discount) || 0;
    const discountPercent = Number(
      invoice.discount_percentage ?? invoice.discountPercentage ?? (subtotal > 0 ? (discountAmount / subtotal) * 100 : 0)
    ) || 0;
    const taxAmount = Number(invoice.tax) || 0;
    const taxLabel = invoice.tax_type || invoice.taxType || 'None';

    const formatCurrency = (value) =>
      `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const tableRows = items.map((item, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>
          <div class="item-name">${item.name}</div>
          ${item.brand || item.description ? `
            <div class="item-subtitle">
              ${item.brand ? `<strong>${item.brand}</strong>` : ''}
              ${item.brand && item.description ? ' - ' : ''}
              ${item.description || ''}
            </div>` : ''
          }
        </td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatCurrency(item.price)}</td>
        <td style="text-align: right; font-weight: bold;">${formatCurrency(item.total)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px 40px;
              background-color: #fff;
            }
            .top-invoice-label {
              text-align: right;
              font-size: 11px;
              letter-spacing: 2px;
              color: #7a431d;
              font-weight: bold;
              margin-bottom: 12px;
              text-transform: uppercase;
            }
            .logo-container {
              text-align: center;
              margin-bottom: 15px;
            }
            .logo-box {
              display: inline-block;
              background-color: #7a431d;
              color: #fff;
              padding: 12px 36px;
              border-radius: 2px;
              margin-bottom: 8px;
            }
            .logo-text-main {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: 2px;
              line-height: 1.2;
            }
            .shop-details {
              font-size: 12px;
              color: #475569;
              line-height: 1.4;
            }
            .header-divider {
              border-top: 1.5px solid #ebdcd0;
              margin: 15px 0 20px 0;
            }
            .meta-section {
              display: table;
              width: 100%;
              margin-bottom: 25px;
            }
            .meta-col-left {
              display: table-cell;
              width: 50%;
              vertical-align: top;
              padding-right: 15px;
            }
            .meta-col-right {
              display: table-cell;
              width: 50%;
              vertical-align: top;
              border-left: 1.5px solid #ebdcd0;
              padding-left: 20px;
            }
            .meta-title {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 6px;
              font-weight: bold;
            }
            .customer-name {
              font-size: 16px;
              font-weight: bold;
              color: #0f172a;
            }
            .customer-phone {
              font-size: 13px;
              color: #475569;
              margin-top: 4px;
            }
            .meta-table {
              border-collapse: collapse;
              font-size: 13px;
              width: 100%;
            }
            .meta-table tr td {
              padding: 4px 0;
            }
            .meta-table-label {
              font-weight: 600;
              color: #64748b;
              width: 100px;
            }
            .meta-table-value {
              color: #0f172a;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
              border: 1px solid #ebdcd0;
            }
            .items-table th {
              background-color: #7a431d;
              color: #fff;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              padding: 10px;
              border: 1px solid #7a431d;
            }
            .items-table td {
              padding: 10px;
              font-size: 13px;
              border: 1px solid #ebdcd0;
              vertical-align: middle;
            }
            .item-name {
              font-weight: bold;
              color: #0f172a;
            }
            .item-subtitle {
              font-size: 11px;
              color: #64748b;
              font-style: italic;
              margin-top: 3px;
            }
            .dashed-divider {
              border-top: 1px dashed #7a431d;
              margin: 20px 0;
            }
            .footer-section {
              display: table;
              width: 100%;
              margin-top: 15px;
            }
            .footer-left {
              display: table-cell;
              width: 50%;
              vertical-align: bottom;
              padding-bottom: 5px;
            }
            .footer-right {
              display: table-cell;
              width: 50%;
              vertical-align: top;
              text-align: right;
            }
            .social-icons-row {
              margin-bottom: 12px;
            }
            .social-icon-wrapper {
              display: inline-flex;
              align-items: center;
              margin-right: 15px;
            }
            .social-icon-text {
              font-size: 12px;
              color: #475569;
              font-weight: 600;
              margin-left: 4px;
            }
            .gstin-label {
              font-size: 11px;
              color: #64748b;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .totals-summary-table {
              display: inline-table;
              border-collapse: collapse;
              font-size: 13px;
              width: 260px;
              text-align: left;
            }
            .totals-summary-table tr td {
              padding: 5px 0;
            }
            .totals-summary-table tr.grand-total-row td {
              border-top: 1.5px solid #ebdcd0;
              border-bottom: 1.5px solid #7a431d;
              font-weight: bold;
              font-size: 16px;
              color: #7a431d;
              padding: 8px 0;
            }
            .signature-box {
              margin-top: 40px;
              text-align: right;
              display: inline-block;
              width: 160px;
            }
            .signature-line {
              border-top: 1px solid #7a431d;
              margin-bottom: 5px;
            }
            .signature-text {
              font-size: 10px;
              font-weight: bold;
              color: #7a431d;
              letter-spacing: 1px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="top-invoice-label">${headerSub}</div>

          <div class="logo-container">
            ${logoImage ? `
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${logoImage}" style="max-height: 70px; max-width: 220px; object-fit: contain;" />
            </div>` : `
            <div class="logo-box">
              <div class="logo-text-main">${shopName.toUpperCase()}</div>
            </div>`}
            <div class="shop-details">
              ${address}<br/>
              ${gmail || userDetails.email || 'contact@lumina.com'}
            </div>
          </div>

          <div class="header-divider"></div>

          <div class="meta-section">
            <div class="meta-col-left">
              <div class="meta-title">To,</div>
              <div class="customer-name">${invoice.customer_name}</div>
              ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
            </div>
            <div class="meta-col-right">
              <table class="meta-table">
                <tr>
                  <td class="meta-table-label">Invoice No</td>
                  <td style="width: 15px;">:</td>
                  <td class="meta-table-value" style="font-weight: bold;">${invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td class="meta-table-label">Invoice Dt</td>
                  <td>:</td>
                  <td class="meta-table-value">${dateStr}</td>
                </tr>
                <tr>
                  <td class="meta-table-label">Time</td>
                  <td>:</td>
                  <td class="meta-table-value">${timeStr}</td>
                </tr>
              </table>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">Sr.</th>
                <th style="text-align: left;">Description</th>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th style="width: 110px; text-align: right;">Rate</th>
                <th style="width: 120px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="dashed-divider"></div>

          <div class="footer-section">
            <div class="footer-left">
              <div class="social-icons-row" style="margin-top: 10px; display: flex; flex-wrap: wrap;">
                ${contactNumber || userDetails.phone ? `
                <span class="social-icon-wrapper" style="margin-right: 15px; margin-bottom: 5px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#25d366" style="vertical-align: middle; margin-right: 4px;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.73.001-2.595-1.013-5.035-2.856-6.88C16.638 2.148 14.195 1.13 11.602 1.13c-5.45 0-9.875 4.372-9.878 9.735-.001 1.778.496 3.507 1.441 5.062L2.16 20.4l4.487-1.246z"/></svg>
                  <span class="social-icon-text" style="font-size: 11px; color: #475569; font-weight: 600; vertical-align: middle;">${contactNumber || userDetails.phone}</span>
                </span>` : ''}

                ${instagram ? `
                <span class="social-icon-wrapper" style="margin-right: 15px; margin-bottom: 5px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#e1306c" style="vertical-align: middle; margin-right: 4px;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                  <span class="social-icon-text" style="font-size: 11px; color: #475569; font-weight: 600; vertical-align: middle;">${instagram}</span>
                </span>` : ''}

                ${gmail ? `
                <span class="social-icon-wrapper" style="margin-right: 15px; margin-bottom: 5px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#ea4335" style="vertical-align: middle; margin-right: 4px;"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-1.29 1.454-2.032 2.514-1.234L12 10.917l9.486-7.114C22.546 3.005 24 3.747 24 5.457z"/></svg>
                  <span class="social-icon-text" style="font-size: 11px; color: #475569; font-weight: 600; vertical-align: middle;">${gmail}</span>
                </span>` : ''}
              </div>
              <div class="gstin-label">GSTIN: ${gstin}</div>
              <div style="font-size: 11px; margin-top: 15px; color: #64748b; line-height: 1.4; font-style: italic; text-align: left;">
                ${footerMsg.replace(/\n/g, '<br/>')}
              </div>
            </div>

            <div class="footer-right">
              <table class="totals-summary-table">
                <tr>
                  <td style="text-align: left; color: #475569;">Subtotal</td>
                  <td style="text-align: right; color: #0f172a;">${formatCurrency(subtotal)}</td>
                </tr>
                ${discountAmount > 0 ? `
                <tr>
                  <td style="text-align: left; color: #475569;">Discount (${discountPercent.toFixed(2)}%)</td>
                  <td style="text-align: right; color: #dc2626;">-${formatCurrency(discountAmount)}</td>
                </tr>` : ''}
                ${taxAmount > 0 ? `
                <tr>
                  <td style="text-align: left; color: #475569;">Tax (${taxLabel})</td>
                  <td style="text-align: right; color: #0f172a;">+${formatCurrency(taxAmount)}</td>
                </tr>` : ''}
                <tr class="grand-total-row">
                  <td style="text-align: left;">TOTAL</td>
                  <td style="text-align: right;">${formatCurrency(invoice.total)}</td>
                </tr>
              </table>
              ${showSign ? `
              <br/>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-text">SIGN</div>
              </div>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
  },

  shareInvoicePdf: async (shopName, invoice, items, userDetails = {}) => {
    try {
      let customerPhone = invoice.customer_phone || '';
      if (!customerPhone && invoice.customer_id) {
        try {
          const db = await getDB();
          const cust = await db.getFirstAsync('SELECT phone FROM customers WHERE id = ?;', [invoice.customer_id]);
          if (cust) {
            customerPhone = cust.phone;
          }
        } catch (err) {
          console.log('Error fetching customer details for PDF:', err);
        }
      }

      const enrichedItems = await Promise.all(items.map(async (item) => {
        try {
          const db = await getDB();
          const prod = await db.getFirstAsync('SELECT description, brand FROM products WHERE id = ?;', [item.id]);
          return {
            ...item,
            description: prod?.description || '',
            brand: prod?.brand || '',
          };
        } catch (err) {
          return item;
        }
      }));

      const headerSub = await AsyncStorage.getItem('settings_layout_header_sub') || 'Invoice / Bill Summary';
      const footerMsg = await AsyncStorage.getItem('settings_layout_footer_msg') || 'Thank you for your business!';
      const showSignString = await AsyncStorage.getItem('settings_layout_show_sign');
      const showSign = showSignString !== null ? showSignString === 'true' : true;
      const address = await AsyncStorage.getItem('settings_business_address') || '123 Silicon Valley Road, Bangalore - 560001';
      const gstin = await AsyncStorage.getItem('settings_gstin') || '22AAAAA0000A1Z5';
      const instagram = await AsyncStorage.getItem('settings_layout_instagram') || '';
      const gmail = await AsyncStorage.getItem('settings_layout_gmail') || '';
      const contactNumber = await AsyncStorage.getItem('settings_layout_contact_number') || '';
      const logoImage = await AsyncStorage.getItem('settings_layout_logo_image') || null;

      const htmlContent = pdfService.generateInvoiceHtml(shopName, invoice, enrichedItems, userDetails, customerPhone, {
        headerSub,
        footerMsg,
        showSign,
        address,
        gstin,
        instagram,
        gmail,
        contactNumber,
        logoImage
      });

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });

      let sourceUri = uri || '';
      if (sourceUri) {
        if (!sourceUri.startsWith('file://')) {
          if (sourceUri.startsWith('file:')) {
            sourceUri = 'file:///' + sourceUri.substring(5).replace(/^\/+/, '');
          } else {
            sourceUri = 'file:///' + sourceUri.replace(/^\/+/, '');
          }
        } else if (sourceUri.startsWith('file://') && !sourceUri.startsWith('file:///')) {
          sourceUri = 'file:///' + sourceUri.substring(7).replace(/^\/+/, '');
        }
      }

      let shareUri = sourceUri;
      try {
        if (FileSystem && FileSystem.cacheDirectory) {
          const cleanFileName = `Invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
          const targetUri = FileSystem.cacheDirectory + cleanFileName;
          await FileSystem.copyAsync({
            from: sourceUri,
            to: targetUri,
          });
          shareUri = targetUri;
        }
      } catch (copyErr) {
        console.log('Failed to copy PDF to cache directory, using original URI:', copyErr);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice_${invoice.invoice_number}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        console.warn('Sharing is not available on this platform');
      }
    } catch (error) {
      console.error('Error generating/sharing PDF:', error);
      throw error;
    }
  },
};
