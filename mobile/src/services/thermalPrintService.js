export const thermalPrintService = {
  CMD: {
    INIT: '\x1b\x40',
    ALIGN_LEFT: '\x1b\x61\x00',
    ALIGN_CENTER: '\x1b\x61\x01',
    ALIGN_RIGHT: '\x1b\x61\x02',
    TEXT_NORMAL: '\x1d\x21\x00',
    TEXT_DOUBLE: '\x1d\x21\x11',
    BOLD_ON: '\x1b\x45\x01',
    BOLD_OFF: '\x1b\x45\x00',
    LINE_FEED: '\x0a',
    CUT: '\x1d\x56\x00',
  },

  formatInvoice: (shopName, invoice, items) => {
    const C = thermalPrintService.CMD;
    let p = '';
    const subtotal = Number(invoice.subtotal) || 0;
    const discountAmount = Number(invoice.discount) || 0;
    const discountPercent = Number(
      invoice.discount_percentage ?? invoice.discountPercentage ?? (subtotal > 0 ? (discountAmount / subtotal) * 100 : 0)
    ) || 0;
    const taxType = invoice.tax_type || invoice.taxType;

    p += C.INIT;

    p += C.ALIGN_CENTER + C.TEXT_DOUBLE + C.BOLD_ON + shopName + C.LINE_FEED;
    p += C.TEXT_NORMAL + C.BOLD_OFF + 'SALES RECEIPT' + C.LINE_FEED;
    p += '--------------------------------' + C.LINE_FEED;

    p += C.ALIGN_LEFT;
    p += `Invoice #: ${invoice.invoice_number}` + C.LINE_FEED;
    p += `Date: ${new Date(invoice.created_at).toLocaleString()}` + C.LINE_FEED;
    p += `Customer: ${invoice.customer_name}` + C.LINE_FEED;
    p += `Payment: ${invoice.payment_method}` + C.LINE_FEED;
    p += '--------------------------------' + C.LINE_FEED;

    p += 'Item          Qty   Price   Total' + C.LINE_FEED;
    p += '--------------------------------' + C.LINE_FEED;

    items.forEach((item) => {
      const name = item.name.substring(0, 12).padEnd(12);
      const qty = item.quantity.toString().padStart(4);
      const price = Number(item.price).toFixed(0).padStart(6);
      const total = Number(item.total).toFixed(0).padStart(7);
      p += `${name}${qty} ${price} ${total}` + C.LINE_FEED;
    });

    p += '--------------------------------' + C.LINE_FEED;

    p += C.ALIGN_RIGHT;
    p += `Subtotal: ₹${subtotal.toFixed(2)}` + C.LINE_FEED;
    if (discountAmount > 0) {
      p += `Discount(${discountPercent.toFixed(2)}%): -₹${discountAmount.toFixed(2)}` + C.LINE_FEED;
    }
    if (taxType && taxType !== 'None') {
      p += `${taxType} Tax: +₹${Number(invoice.tax).toFixed(2)}` + C.LINE_FEED;
      if (invoice.cgst > 0) p += `  CGST: +₹${Number(invoice.cgst).toFixed(2)}` + C.LINE_FEED;
      if (invoice.sgst > 0) p += `  SGST: +₹${Number(invoice.sgst).toFixed(2)}` + C.LINE_FEED;
      if (invoice.igst > 0) p += `  IGST: +₹${Number(invoice.igst).toFixed(2)}` + C.LINE_FEED;
    }
    p += C.BOLD_ON + `TOTAL: ₹${Number(invoice.total).toFixed(2)}` + C.BOLD_OFF + C.LINE_FEED;
    p += '--------------------------------' + C.LINE_FEED;

    p += C.ALIGN_CENTER;
    p += 'Thank you for shopping!' + C.LINE_FEED;
    p += 'Software Powered by Offline POS' + C.LINE_FEED;
    p += C.LINE_FEED + C.LINE_FEED + C.LINE_FEED;

    p += C.CUT;

    return p;
  },

  printRawSocket: async (ipAddress, port, printString) => {
    console.log(`Sending ESC/POS print payload to Wi-Fi/Ethernet thermal printer at ${ipAddress}:${port}`);
  }
};
