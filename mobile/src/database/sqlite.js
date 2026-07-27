import * as SQLite from 'expo-sqlite';

let dbInstance = null;

export const getDB = async () => {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('billing_app.db');
  return dbInstance;
};

export const initDB = async () => {
  try {
    const db = await getDB();

    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Products table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        sku TEXT,
        category TEXT,
        image TEXT,
        barcode TEXT,
        business_category TEXT,
        brand TEXT,
        supplier TEXT,
        purchase_price REAL,
        tax REAL NOT NULL DEFAULT 0,
        discount REAL NOT NULL DEFAULT 0,
        unit TEXT,
        minimum_stock INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        other_details TEXT,
        user_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced'
      );
    `);

    // Customers table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        outstanding_balance REAL NOT NULL DEFAULT 0.0,
        user_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced'
      );
    `);

    // Invoices table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        invoice_number TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        items_json TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL DEFAULT 0,
        tax REAL NOT NULL DEFAULT 0,
        tax_type TEXT NOT NULL DEFAULT 'None',
        cgst REAL NOT NULL DEFAULT 0,
        sgst REAL NOT NULL DEFAULT 0,
        igst REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'Cash',
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced'
      );
    `);

    // Sync Queue table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        local_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Dynamic Database Migration for Existing Installations
    const columnsInfo = await db.getAllAsync('PRAGMA table_info(products);');
    const existingColumns = columnsInfo.map(col => col.name);

    const columnsToMigrate = [
      { name: 'image', type: 'TEXT' },
      { name: 'barcode', type: 'TEXT' },
      { name: 'business_category', type: 'TEXT' },
      { name: 'brand', type: 'TEXT' },
      { name: 'supplier', type: 'TEXT' },
      { name: 'purchase_price', type: 'REAL' },
      { name: 'tax', type: 'REAL NOT NULL DEFAULT 0' },
      { name: 'discount', type: 'REAL NOT NULL DEFAULT 0' },
      { name: 'unit', type: 'TEXT' },
      { name: 'minimum_stock', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'description', type: 'TEXT' },
      { name: 'status', type: 'TEXT NOT NULL DEFAULT "Active"' },
      { name: 'other_details', type: 'TEXT' }
    ];

    for (const col of columnsToMigrate) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Migrating products table: adding column ${col.name}`);
        await db.execAsync(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type};`);
      }
    }

    // Dynamic Database Migration for Invoices Table
    const invoiceColumnsInfo = await db.getAllAsync('PRAGMA table_info(invoices);');
    const existingInvoiceColumns = invoiceColumnsInfo.map(col => col.name);
    if (!existingInvoiceColumns.includes('customer_phone')) {
      console.log('Migrating invoices table: adding column customer_phone');
      await db.execAsync('ALTER TABLE invoices ADD COLUMN customer_phone TEXT;');
    }

    // Auto-Recovery for mismatched sync_queue columns
    const queueColumnsInfo = await db.getAllAsync('PRAGMA table_info(sync_queue);');
    const existingQueueColumns = queueColumnsInfo.map(col => col.name);
    if (existingQueueColumns.includes('payload_json')) {
      console.log('Dropping incorrect sync_queue table with payload_json');
      await db.execAsync('DROP TABLE sync_queue;');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          table_name TEXT NOT NULL,
          local_id TEXT NOT NULL,
          data_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
    }

    console.log('SQLite database initialized successfully');
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
};
