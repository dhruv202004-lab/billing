const Invoice = require('../models/Invoice');
const Product = require('../models/Product');

// Get all invoices (with optional sync support)
exports.getInvoices = async (req, res) => {
  try {
    const { lastSyncedAt } = req.query;
    let query = { userId: req.user.id };

    if (lastSyncedAt) {
      query.updatedAt = { $gt: new Date(lastSyncedAt) };
    }

    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error('getInvoices error:', error);
    res.status(500).json({ message: error.message || 'Error fetching invoices' });
  }
};

// Create or Sync invoices
exports.upsertInvoices = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (let item of items) {
      const {
        invoiceNumber,
        customerId,
        customerName,
        customerPhone,
        items: saleItems,
        subtotal,
        discount,
        discountPercentage,
        tax,
        taxType,
        cgst,
        sgst,
        igst,
        total,
        paymentMethod,
        remoteId,
        createdAt,
      } = item;

      let invoice;
      if (remoteId) {
        invoice = await Invoice.findOneAndUpdate(
          { _id: remoteId, userId: req.user.id },
          {
            invoiceNumber,
            customerId: customerId || undefined,
            customerName,
            customerPhone,
            items: saleItems,
            subtotal,
            discount,
            discountPercentage: discountPercentage || 0,
            tax,
            taxType: taxType || 'None',
            cgst: cgst || 0,
            sgst: sgst || 0,
            igst: igst || 0,
            total,
            paymentMethod,
            updatedAt: Date.now(),
          },
          { new: true }
        );
      }

      if (!invoice) {
        invoice = new Invoice({
          invoiceNumber,
          customerId: customerId || undefined,
          customerName,
          customerPhone,
          items: saleItems,
          subtotal,
          discount,
          discountPercentage: discountPercentage || 0,
          tax,
          taxType: taxType || 'None',
          cgst: cgst || 0,
          sgst: sgst || 0,
          igst: igst || 0,
          total,
          paymentMethod,
          userId: req.user.id,
          createdAt: createdAt ? new Date(createdAt) : Date.now(),
        });
        await invoice.save();

        // Adjust stock for each item
        for (let saleItem of saleItems) {
          if (saleItem.productId) {
            await Product.findOneAndUpdate(
              { _id: saleItem.productId, userId: req.user.id },
              { $inc: { stock: -saleItem.quantity } }
            );
          }
        }
      }
      results.push(invoice);
    }

    res.status(201).json(Array.isArray(req.body) ? results : results[0]);
  } catch (error) {
    console.error('upsertInvoices error:', error);
    res.status(500).json({ message: error.message || 'Error upserting invoices' });
  }
};

// Delete invoice (optional, typically for administration)
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('deleteInvoice error:', error);
    res.status(500).json({ message: error.message || 'Error deleting invoice' });
  }
};
