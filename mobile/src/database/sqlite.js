import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'billing_app.db';

let dbInstance = null;
let dbOpenPromise = null;
let dbInitPromise = null;

const shouldRecoverFromDbError = (error) => {
  const message = String(error?.message || error || '');
  return (
    message.includes('NativeDatabase.prepareAsync') ||
    message.includes('NullPointerException')
  );
};

const resetDBConnection = async () => {
  const currentDb = dbInstance;

  dbInstance = null;
  dbOpenPromise = null;
  dbInitPromise = null;

  if (currentDb?.closeAsync) {
    try {
      await currentDb.closeAsync();
    } catch (closeError) {
      console.warn('SQLite close during recovery failed:', closeError);
    }
  }
};

const wrapDatabaseMethod = (db, methodName) => {
  const originalMethod = db[methodName]?.bind(db);
  if (!originalMethod || originalMethod.__billingWrapped) {
    return;
  }

  const wrappedMethod = async (...args) => {
    try {
      return await originalMethod(...args);
    } catch (error) {
      if (!shouldRecoverFromDbError(error)) {
        throw error;
      }

      console.warn(`SQLite ${methodName} failed, retrying after reconnect:`, error);
      await resetDBConnection();
      const reopenedDb = await initDB();
      return reopenedDb[methodName](...args);
    }
  };

  wrappedMethod.__billingWrapped = true;
  db[methodName] = wrappedMethod;
};

const decorateDatabase = (db) => {
  if (db.__billingDecorated) {
    return db;
  }

  ['execAsync', 'getAllAsync', 'getFirstAsync', 'runAsync'].forEach((methodName) => {
    wrapDatabaseMethod(db, methodName);
  });

  db.__billingDecorated = true;
  return db;
};

const openDB = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  if (!dbOpenPromise) {
    dbOpenPromise = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then((db) => {
        dbInstance = decorateDatabase(db);
        return dbInstance;
      })
      .catch((error) => {
        dbOpenPromise = null;
        throw error;
      });
  }

  return dbOpenPromise;
};

const initializeSchema = async (db) => {
  await db.execAsync('PRAGMA foreign_keys = ON;');

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
      discount_percentage REAL NOT NULL DEFAULT 0,
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

  const columnsInfo = await db.getAllAsync('PRAGMA table_info(products);');
  const existingColumns = columnsInfo.map((col) => col.name);
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
    { name: 'other_details', type: 'TEXT' },
  ];

  for (const column of columnsToMigrate) {
    if (!existingColumns.includes(column.name)) {
      console.log(`Migrating products table: adding column ${column.name}`);
      await db.execAsync(`ALTER TABLE products ADD COLUMN ${column.name} ${column.type};`);
    }
  }

  const invoiceColumnsInfo = await db.getAllAsync('PRAGMA table_info(invoices);');
  const existingInvoiceColumns = invoiceColumnsInfo.map((col) => col.name);

  if (!existingInvoiceColumns.includes('customer_phone')) {
    console.log('Migrating invoices table: adding column customer_phone');
    await db.execAsync('ALTER TABLE invoices ADD COLUMN customer_phone TEXT;');
  }

  if (!existingInvoiceColumns.includes('discount_percentage')) {
    console.log('Migrating invoices table: adding column discount_percentage');
    await db.execAsync(
      'ALTER TABLE invoices ADD COLUMN discount_percentage REAL NOT NULL DEFAULT 0;'
    );
  }

  const queueColumnsInfo = await db.getAllAsync('PRAGMA table_info(sync_queue);');
  const existingQueueColumns = queueColumnsInfo.map((col) => col.name);

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
};

export const initDB = async () => {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        const db = await openDB();
        await initializeSchema(db);
        console.log('SQLite database initialized successfully');
        return db;
      } catch (error) {
        dbInitPromise = null;
        console.error('Error initializing SQLite database:', error);
        throw error;
      }
    })();
  }

  return dbInitPromise;
};

export const getDB = async () => {
  return initDB();
};
