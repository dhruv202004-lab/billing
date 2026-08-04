import { getDB } from '../database/sqlite';

const generateId = () => Math.random().toString(36).substring(2, 11) + '-' + Math.random().toString(36).substring(2, 11);

// Utility to push to sync queue
const pushToSyncQueue = async (db, action, tableName, localId, data) => {
  const createdAt = new Date().toISOString();
  const dataJson = JSON.stringify(data);
  await db.runAsync(
    'INSERT INTO sync_queue (action, table_name, local_id, data_json, created_at) VALUES (?, ?, ?, ?, ?);',
    [action, tableName, localId, dataJson, createdAt]
  );
};

export const dbService = {
  // PRODUCTS
  getProducts: async (userId) => {
    const db = await getDB();
    return await db.getAllAsync(
      'SELECT * FROM products WHERE user_id = ? AND sync_status != "pending_delete" ORDER BY name ASC;',
      [userId]
    );
  },

  getProductById: async (id) => {
    const db = await getDB();
    return await db.getFirstAsync('SELECT * FROM products WHERE id = ?;', [id]);
  },

  addProduct: async (userId, productData) => {
    const db = await getDB();
    const id = generateId();
    const updatedAt = new Date().toISOString();
    const syncStatus = 'pending_create';
    const {
      name, price, stock, sku, category,
      image, barcode, businessCategory, brand, supplier,
      purchasePrice, tax = 0, discount = 0, unit, minimumStock = 0,
      description, status = 'Active', otherDetails
    } = productData;

    const otherDetailsJson = otherDetails ? JSON.stringify(otherDetails) : null;

    await db.runAsync(
      `INSERT INTO products (
        id, name, price, stock, sku, category, image, barcode,
        business_category, brand, supplier, purchase_price, tax,
        discount, unit, minimum_stock, description, status,
        other_details, user_id, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id, name, Number(price), Number(stock), sku || '', category || '',
        image || null, barcode || '', businessCategory || '', brand || '',
        supplier || '', purchasePrice ? Number(purchasePrice) : null,
        Number(tax), Number(discount), unit || '', Number(minimumStock),
        description || '', status, otherDetailsJson, userId, updatedAt, syncStatus
      ]
    );

    // Push to sync queue
    await pushToSyncQueue(db, 'CREATE', 'products', id, {
      name, price: Number(price), stock: Number(stock), sku, category,
      image, barcode, businessCategory, brand, supplier,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      tax: Number(tax), discount: Number(discount), unit,
      minimumStock: Number(minimumStock), description, status, otherDetails
    });

    return {
      id, name, price: Number(price), stock: Number(stock), sku, category,
      image, barcode, business_category: businessCategory, brand, supplier,
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      tax: Number(tax), discount: Number(discount), unit,
      minimum_stock: Number(minimumStock), description, status,
      other_details: otherDetails, user_id: userId, updated_at: updatedAt, sync_status: syncStatus
    };
  },

  updateProduct: async (userId, productId, productData) => {
    const db = await getDB();
    const updatedAt = new Date().toISOString();
    const existing = await db.getFirstAsync('SELECT * FROM products WHERE id = ?;', [productId]);
    if (!existing) throw new Error('Product not found');

    const syncStatus = existing.sync_status === 'pending_create' ? 'pending_create' : 'pending_update';
    const {
      name, price, stock, sku, category,
      image, barcode, businessCategory, brand, supplier,
      purchasePrice, tax, discount, unit, minimumStock,
      description, status, otherDetails
    } = productData;

    const otherDetailsJson = otherDetails ? JSON.stringify(otherDetails) : null;

    await db.runAsync(
      `UPDATE products SET 
        name = ?, price = ?, stock = ?, sku = ?, category = ?, image = ?,
        barcode = ?, business_category = ?, brand = ?, supplier = ?,
        purchase_price = ?, tax = ?, discount = ?, unit = ?, minimum_stock = ?,
        description = ?, status = ?, other_details = ?, updated_at = ?, sync_status = ?
      WHERE id = ?;`,
      [
        name, Number(price), Number(stock), sku || '', category || '',
        image || null, barcode || '', businessCategory || '', brand || '',
        supplier || '', purchasePrice ? Number(purchasePrice) : null,
        Number(tax), Number(discount), unit || '', Number(minimumStock),
        description || '', status, otherDetailsJson, updatedAt, syncStatus, productId
      ]
    );

    await pushToSyncQueue(db, 'UPDATE', 'products', productId, {
      remoteId: existing.remote_id,
      name, price: Number(price), stock: Number(stock), sku, category,
      image, barcode, businessCategory, brand, supplier,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      tax: Number(tax), discount: Number(discount), unit,
      minimumStock: Number(minimumStock), description, status, otherDetails
    });

    return {
      id: productId, remote_id: existing.remote_id, name, price: Number(price),
      stock: Number(stock), sku, category, image, barcode,
      business_category: businessCategory, brand, supplier,
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      tax: Number(tax), discount: Number(discount), unit,
      minimum_stock: Number(minimumStock), description, status,
      other_details: otherDetails, user_id: userId, updated_at: updatedAt, sync_status: syncStatus
    };
  },

  deleteProduct: async (productId) => {
    const db = await getDB();
    const existing = await db.getFirstAsync('SELECT * FROM products WHERE id = ?;', [productId]);
    if (!existing) throw new Error('Product not found');

    if (existing.sync_status === 'pending_create') {
      await db.runAsync('DELETE FROM products WHERE id = ?;', [productId]);
      await db.runAsync('DELETE FROM sync_queue WHERE table_name = "products" AND local_id = ?;', [productId]);
    } else {
      await db.runAsync('UPDATE products SET sync_status = "pending_delete", updated_at = ? WHERE id = ?;', [new Date().toISOString(), productId]);
      await pushToSyncQueue(db, 'DELETE', 'products', productId, { remoteId: existing.remote_id });
    }
  },

  // CUSTOMERS
  getCustomers: async (userId) => {
    const db = await getDB();
    return await db.getAllAsync(
      'SELECT * FROM customers WHERE user_id = ? AND sync_status != "pending_delete" ORDER BY name ASC;',
      [userId]
    );
  },

  getCustomerById: async (id) => {
    const db = await getDB();
    return await db.getFirstAsync('SELECT * FROM customers WHERE id = ?;', [id]);
  },

  addCustomer: async (userId, customerData) => {
    const db = await getDB();
    const id = generateId();
    const updatedAt = new Date().toISOString();
    const syncStatus = 'pending_create';
    const { name, phone, email, outstandingBalance = 0 } = customerData;

    await db.runAsync(
      'INSERT INTO customers (id, name, phone, email, outstanding_balance, user_id, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
      [id, name, phone, email || '', Number(outstandingBalance), userId, updatedAt, syncStatus]
    );

    await pushToSyncQueue(db, 'CREATE', 'customers', id, { name, phone, email, outstandingBalance: Number(outstandingBalance) });

    return { id, name, phone, email, outstanding_balance: Number(outstandingBalance), user_id: userId, updated_at: updatedAt, sync_status: syncStatus };
  },

  updateCustomer: async (userId, customerId, customerData) => {
    const db = await getDB();
    const updatedAt = new Date().toISOString();
    const existing = await db.getFirstAsync('SELECT * FROM customers WHERE id = ?;', [customerId]);
    if (!existing) throw new Error('Customer not found');

    const syncStatus = existing.sync_status === 'pending_create' ? 'pending_create' : 'pending_update';
    const { name, phone, email, outstandingBalance } = customerData;

    await db.runAsync(
      'UPDATE customers SET name = ?, phone = ?, email = ?, outstanding_balance = ?, updated_at = ?, sync_status = ? WHERE id = ?;',
      [name, phone, email || '', Number(outstandingBalance), updatedAt, syncStatus, customerId]
    );

    await pushToSyncQueue(db, 'UPDATE', 'customers', customerId, {
      remoteId: existing.remote_id,
      name,
      phone,
      email,
      outstandingBalance: Number(outstandingBalance),
    });

    return { id: customerId, remote_id: existing.remote_id, name, phone, email, outstanding_balance: Number(outstandingBalance), user_id: userId, updated_at: updatedAt, sync_status: syncStatus };
  },

  deleteCustomer: async (customerId) => {
    const db = await getDB();
    const existing = await db.getFirstAsync('SELECT * FROM customers WHERE id = ?;', [customerId]);
    if (!existing) throw new Error('Customer not found');

    if (existing.sync_status === 'pending_create') {
      await db.runAsync('DELETE FROM customers WHERE id = ?;', [customerId]);
      await db.runAsync('DELETE FROM sync_queue WHERE table_name = "customers" AND local_id = ?;', [customerId]);
    } else {
      await db.runAsync('UPDATE customers SET sync_status = "pending_delete", updated_at = ? WHERE id = ?;', [new Date().toISOString(), customerId]);
      await pushToSyncQueue(db, 'DELETE', 'customers', customerId, { remoteId: existing.remote_id });
    }
  },

  // INVOICES (POS Sales)
  getInvoices: async (userId) => {
    const db = await getDB();
    return await db.getAllAsync(
      'SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC;',
      [userId]
    );
  },

  addInvoice: async (userId, invoiceData) => {
    const db = await getDB();
    const id = generateId();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const syncStatus = 'pending_create';

    const {
      invoiceNumber,
      customerId,
      customerName,
      customerPhone = '',
      items,
      subtotal,
      discount = 0,
      discountPercentage = 0,
      tax = 0,
      taxType = 'None',
      cgst = 0,
      sgst = 0,
      igst = 0,
      total,
      paymentMethod = 'Cash',
    } = invoiceData;

    const itemsJson = JSON.stringify(items);
    await db.runAsync(
      'INSERT INTO invoices (id, invoice_number, customer_id, customer_name, customer_phone, items_json, subtotal, discount, discount_percentage, tax, tax_type, cgst, sgst, igst, total, payment_method, user_id, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [id, invoiceNumber, customerId || '', customerName, customerPhone, itemsJson, Number(subtotal), Number(discount), Number(discountPercentage), Number(tax), taxType, Number(cgst), Number(sgst), Number(igst), Number(total), paymentMethod, userId, createdAt, updatedAt, syncStatus]
    );

    // Adjust local stock for each product
    for (let item of items) {
      if (item.productId) {
        await db.runAsync(
          'UPDATE products SET stock = stock - ? WHERE id = ?;',
          [item.quantity, item.productId]
        );
      }
    }

    const queueItems = items.map(item => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.total,
    }));

    await pushToSyncQueue(db, 'CREATE', 'invoices', id, {
      invoiceNumber,
      customerId: customerId,
      customerName,
      customerPhone,
      items: queueItems,
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
      createdAt,
    });

    return { id, invoice_number: invoiceNumber, customer_id: customerId, customer_name: customerName, customer_phone: customerPhone, items, subtotal, discount, discount_percentage: discountPercentage, tax, tax_type: taxType, cgst, sgst, igst, total, payment_method: paymentMethod, user_id: userId, created_at: createdAt, sync_status: syncStatus };
  },

  // SYNC QUEUE HELPER METHODS
  getSyncQueue: async () => {
    const db = await getDB();
    return await db.getAllAsync('SELECT * FROM sync_queue ORDER BY id ASC;');
  },

  deleteSyncQueueItem: async (queueId) => {
    const db = await getDB();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?;', [queueId]);
  },
};
