const Product = require('../models/Product');

// Get all products (with optional sync support)
exports.getProducts = async (req, res) => {
  try {
    const { lastSyncedAt } = req.query;
    let query = { userId: req.user.id };

    if (lastSyncedAt) {
      query.updatedAt = { $gt: new Date(lastSyncedAt) };
    }

    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ message: error.message || 'Error fetching products' });
  }
};

// Create or Sync products
exports.upsertProducts = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (let item of items) {
      const {
        name, price, stock, sku, category, remoteId,
        image, barcode, businessCategory, brand, supplier,
        purchasePrice, tax, discount, unit, minimumStock,
        description, status, otherDetails
      } = item;

      let product;
      if (remoteId) {
        product = await Product.findOneAndUpdate(
          { _id: remoteId, userId: req.user.id },
          {
            name, price, stock, sku, category, image, barcode,
            businessCategory, brand, supplier, purchasePrice, tax,
            discount, unit, minimumStock, description, status,
            otherDetails, updatedAt: Date.now()
          },
          { new: true }
        );
      }

      if (!product) {
        product = new Product({
          name, price, stock, sku, category, image, barcode,
          businessCategory, brand, supplier, purchasePrice, tax,
          discount, unit, minimumStock, description, status,
          otherDetails, userId: req.user.id,
        });
        await product.save();
      }
      results.push(product);
    }

    res.status(201).json(Array.isArray(req.body) ? results : results[0]);
  } catch (error) {
    console.error('upsertProducts error:', error);
    res.status(500).json({ message: error.message || 'Error upserting products' });
  }
};

// Update a single product
exports.updateProduct = async (req, res) => {
  try {
    const {
      name, price, stock, sku, category,
      image, barcode, businessCategory, brand, supplier,
      purchasePrice, tax, discount, unit, minimumStock,
      description, status, otherDetails
    } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        name, price, stock, sku, category,
        image, barcode, businessCategory, brand, supplier,
        purchasePrice, tax, discount, unit, minimumStock,
        description, status, otherDetails, updatedAt: Date.now()
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ message: error.message || 'Error updating product' });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('deleteProduct error:', error);
    res.status(500).json({ message: error.message || 'Error deleting product' });
  }
};
