import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getDB } from '../database/sqlite';

export const pdfService = {
  generateInvoiceHtml: (shopName, invoice, items, userDetails = {}, customerPhone = '') => {
    // Format Date & Time matching mockup: e.g. 24-Oct-2023 04:20:15PM
    const invoiceDate = new Date(invoice.created_at);
    
    const dateStr = invoiceDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-'); // e.g. 24-Oct-2023

    const timeStr = invoiceDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).replace(/ /g, ''); // e.g. 04:20:15PM

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
        <td style="text-align: right;">₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold;">₹${Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
              width: 250px;
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
          <div class="top-invoice-label">Invoice</div>

          <!-- Centered Shop Banner -->
          <div class="logo-container">
            <div class="logo-box">
              <div class="logo-text-main">${shopName.toUpperCase()}</div>
            </div>
            <div class="shop-details">
              123 Silicon Valley Road, Bangalore - 560001.<br/>
              ${userDetails.email || 'contact@lumina.com'}
            </div>
          </div>

          <div class="header-divider"></div>

          <!-- Metadata Section -->
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

          <!-- Items Table -->
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

          <!-- Footnote & Totals Section -->
          <div class="footer-section">
            <div class="footer-left">
              <!-- Social Contacts Footnote -->
              <div class="social-icons-row">
                <span class="social-icon-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#3b5998" style="vertical-align: middle;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </span>
                <span class="social-icon-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#e1306c" style="vertical-align: middle;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                </span>
                <span class="social-icon-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366" style="vertical-align: middle;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.73.001-2.595-1.013-5.035-2.856-6.88C16.638 2.148 14.195 1.13 11.602 1.13c-5.45 0-9.875 4.372-9.878 9.735-.001 1.778.496 3.507 1.441 5.062L2.16 20.4l4.487-1.246z"/></svg>
                  <span class="social-icon-text">${userDetails.phone || '+91 98765 43210'}</span>
                </span>
              </div>
              <div class="gstin-label">GSTIN: 22AAAAA0000A1Z5</div>
            </div>
            
            <div class="footer-right">
              <!-- Totals Table -->
              <table class="totals-summary-table">
                <tr class="grand-total-row">
                  <td style="text-align: left;">TOTAL</td>
                  <td style="text-align: right;">₹${Number(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="text-align: left; color: #475569; padding-top: 8px;">Advance</td>
                  <td style="text-align: right; color: #0f172a; padding-top: 8px;">₹${Number(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="text-align: left; color: #475569;">Balance</td>
                  <td style="text-align: right; color: #0f172a;">₹0.00</td>
                </tr>
              </table>
              <br/>
              <!-- Signature Box -->
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-text">SIGN</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  },

  shareInvoicePdf: async (shopName, invoice, items, userDetails = {}) => {
    try {
      // 1. Fetch customer details if id exists
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

      // 2. Fetch product details (brand, description) from SQLite for items
      const enrichedItems = await Promise.all(items.map(async (item) => {
        try {
          const db = await getDB();
          // Find by local id (if synced from cart, id matches SQLite product.id)
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

      // 3. Compile HTML
      const htmlContent = pdfService.generateInvoiceHtml(shopName, invoice, enrichedItems, userDetails, customerPhone);
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });

      // Sanitize the source URI returned by Print.printToFileAsync to have file:///
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

      // Copy the generated PDF to a clean filename in the root cache directory.
      // This solves Android FileProvider access issues with subdirectories.
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
