import { getDB } from '../database/sqlite';
import { dbService } from './dbService';
import api from '../config/api';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTO_SYNC_KEY = 'settings_auto_sync';
let activeSyncPromise = null;

export const syncService = {
  getAutoSyncEnabled: async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTO_SYNC_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  },

  setAutoSyncEnabled: async (enabled) => {
    await AsyncStorage.setItem(AUTO_SYNC_KEY, String(enabled));
  },

  isOnline: async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      return state.isConnected && state.isInternetReachable;
    } catch {
      return false;
    }
  },

  pushLocalChanges: async () => {
    const queue = await dbService.getSyncQueue();
    if (queue.length === 0) return { processed: 0, failed: 0, errors: [] };

    const db = await getDB();
    let processedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let item of queue) {
      const { id: queueId, action, table_name: tableName, local_id: localId, data_json: dataJson } = item;
      const data = JSON.parse(dataJson);

      try {
        if (tableName === 'products') {
          if (action === 'CREATE') {
            const res = await api.post('/products', data);
            const remoteId = res.data._id;
            await db.runAsync(
              'UPDATE products SET remote_id = ?, sync_status = "synced" WHERE id = ?;',
              [remoteId, localId]
            );
          } else if (action === 'UPDATE') {
            const remoteId = data.remoteId || (await db.getFirstAsync('SELECT remote_id FROM products WHERE id = ?;', [localId]))?.remote_id;
            if (remoteId) {
              await api.put(`/products/${remoteId}`, data);
              await db.runAsync('UPDATE products SET sync_status = "synced" WHERE id = ?;', [localId]);
            }
          } else if (action === 'DELETE') {
            if (data.remoteId) {
              await api.delete(`/products/${data.remoteId}`);
            }
            await db.runAsync('DELETE FROM products WHERE id = ?;', [localId]);
          }
        } else if (tableName === 'customers') {
          if (action === 'CREATE') {
            const res = await api.post('/customers', data);
            const remoteId = res.data._id;
            await db.runAsync(
              'UPDATE customers SET remote_id = ?, sync_status = "synced" WHERE id = ?;',
              [remoteId, localId]
            );
          } else if (action === 'UPDATE') {
            const remoteId = data.remoteId || (await db.getFirstAsync('SELECT remote_id FROM customers WHERE id = ?;', [localId]))?.remote_id;
            if (remoteId) {
              await api.put(`/customers/${remoteId}`, data);
              await db.runAsync('UPDATE customers SET sync_status = "synced" WHERE id = ?;', [localId]);
            }
          } else if (action === 'DELETE') {
            if (data.remoteId) {
              await api.delete(`/customers/${data.remoteId}`);
            }
            await db.runAsync('DELETE FROM customers WHERE id = ?;', [localId]);
          }
        } else if (tableName === 'invoices') {
          if (action === 'CREATE') {
            const resolvedData = { ...data };

            if (data.customerId && !data.customerId.match(/^[0-9a-fA-F]{24}$/)) {
              const cust = await db.getFirstAsync('SELECT remote_id FROM customers WHERE id = ?;', [data.customerId]);
              if (cust?.remote_id) {
                resolvedData.customerId = cust.remote_id;
              } else {
                delete resolvedData.customerId;
              }
            }

            for (let saleItem of resolvedData.items) {
              if (saleItem.productId && !saleItem.productId.match(/^[0-9a-fA-F]{24}$/)) {
                const prod = await db.getFirstAsync('SELECT remote_id FROM products WHERE id = ?;', [saleItem.productId]);
                if (prod?.remote_id) {
                  saleItem.productId = prod.remote_id;
                } else {
                  delete saleItem.productId;
                }
              }
            }

            const res = await api.post('/invoices', resolvedData);
            const remoteId = res.data._id;
            await db.runAsync(
              'UPDATE invoices SET remote_id = ?, sync_status = "synced" WHERE id = ?;',
              [remoteId, localId]
            );
          }
        }

        await dbService.deleteSyncQueueItem(queueId);
        processedCount++;
      } catch (err) {
        // Build a richer error message: include HTTP status if available, or flag as Network Error
        const isNetworkError = !err.response;
        const status = err.response?.status;
        const detail = isNetworkError
          ? `Network Error — server unreachable (queue item ${queueId}, ${action} ${tableName})`
          : `HTTP ${status} — ${err.response?.data?.message || err.message} (queue item ${queueId}, ${action} ${tableName})`;

        console.warn(`[SyncService] ${detail}`);
        errors.push({ queueId, action, tableName, detail });
        failedCount++;

        // Stop processing further items only when the server is completely unreachable;
        // for HTTP errors (4xx/5xx) we continue so other items are not blocked.
        if (isNetworkError) {
          console.warn('[SyncService] Network unreachable — suspending sync, remaining items kept in queue.');
          break;
        }
        // For HTTP errors, continue to the next queue item.
      }
    }

    return { processed: processedCount, failed: failedCount, errors };
  },

  pullRemoteChanges: async (userId) => {
    const db = await getDB();
    const lastSynced = await AsyncStorage.getItem(`lastSynced_${userId}`) || '';

    const productsRes = await api.get('/products', { params: { lastSyncedAt: lastSynced } });
    for (let prod of productsRes.data) {
      const local = await db.getFirstAsync('SELECT id, sync_status FROM products WHERE remote_id = ?;', [prod._id]);
      if (local) {
        if (local.sync_status === 'synced') {
          await db.runAsync(
            `UPDATE products SET 
              name = ?, price = ?, stock = ?, sku = ?, category = ?, image = ?,
              barcode = ?, business_category = ?, brand = ?, supplier = ?,
              purchase_price = ?, tax = ?, discount = ?, unit = ?, minimum_stock = ?,
              description = ?, status = ?, other_details = ?, updated_at = ? 
             WHERE id = ?;`,
            [
              prod.name, prod.price, prod.stock, prod.sku || '', prod.category || '',
              prod.image || null, prod.barcode || '', prod.businessCategory || '',
              prod.brand || '', prod.supplier || '', prod.purchasePrice || null,
              prod.tax || 0, prod.discount || 0, prod.unit || '', prod.minimumStock || 0,
              prod.description || '', prod.status || 'Active', 
              prod.otherDetails ? JSON.stringify(prod.otherDetails) : null,
              prod.updatedAt, local.id
            ]
          );
        }
      } else {
        const id = Math.random().toString(36).substring(2, 11) + '-' + Math.random().toString(36).substring(2, 11);
        await db.runAsync(
          `INSERT INTO products (
            id, remote_id, name, price, stock, sku, category, image, barcode,
            business_category, brand, supplier, purchase_price, tax,
            discount, unit, minimum_stock, description, status,
            other_details, user_id, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "synced");`,
          [
            id, prod._id, prod.name, prod.price, prod.stock, prod.sku || '', prod.category || '',
            prod.image || null, prod.barcode || '', prod.businessCategory || '',
            prod.brand || '', prod.supplier || '', prod.purchasePrice || null,
            prod.tax || 0, prod.discount || 0, prod.unit || '', prod.minimumStock || 0,
            prod.description || '', prod.status || 'Active',
            prod.otherDetails ? JSON.stringify(prod.otherDetails) : null,
            userId, prod.updatedAt
          ]
        );
      }
    }

    const customersRes = await api.get('/customers', { params: { lastSyncedAt: lastSynced } });
    for (let cust of customersRes.data) {
      const local = await db.getFirstAsync('SELECT id, sync_status FROM customers WHERE remote_id = ?;', [cust._id]);
      if (local) {
        if (local.sync_status === 'synced') {
          await db.runAsync(
            'UPDATE customers SET name = ?, phone = ?, email = ?, outstanding_balance = ?, updated_at = ? WHERE id = ?;',
            [cust.name, cust.phone, cust.email || '', cust.outstandingBalance, cust.updatedAt, local.id]
          );
        }
      } else {
        const id = Math.random().toString(36).substring(2, 11) + '-' + Math.random().toString(36).substring(2, 11);
        await db.runAsync(
          'INSERT INTO customers (id, remote_id, name, phone, email, outstanding_balance, user_id, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "synced");',
          [id, cust._id, cust.name, cust.phone, cust.email || '', cust.outstandingBalance, userId, cust.updatedAt]
        );
      }
    }

    const invoicesRes = await api.get('/invoices', { params: { lastSyncedAt: lastSynced } });
    for (let inv of invoicesRes.data) {
      const local = await db.getFirstAsync('SELECT id FROM invoices WHERE remote_id = ?;', [inv._id]);
      if (!local) {
        let localCustId = '';
        if (inv.customerId) {
          const cust = await db.getFirstAsync('SELECT id FROM customers WHERE remote_id = ?;', [inv.customerId]);
          if (cust) localCustId = cust.id;
        }

        const resolvedItems = [];
        for (let item of inv.items) {
          let localProdId = '';
          if (item.productId) {
            const prod = await db.getFirstAsync('SELECT id FROM products WHERE remote_id = ?;', [item.productId]);
            if (prod) localProdId = prod.id;
          }
          resolvedItems.push({
            productId: localProdId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total,
          });
        }

        const id = Math.random().toString(36).substring(2, 11) + '-' + Math.random().toString(36).substring(2, 11);
        await db.runAsync(
          'INSERT INTO invoices (id, remote_id, invoice_number, customer_id, customer_name, customer_phone, items_json, subtotal, discount, discount_percentage, tax, tax_type, cgst, sgst, igst, total, payment_method, user_id, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "synced");',
          [
            id,
            inv._id,
            inv.invoiceNumber,
            localCustId,
            inv.customerName,
            inv.customerPhone || '',
            JSON.stringify(resolvedItems),
            inv.subtotal,
            inv.discount,
            inv.discountPercentage || 0,
            inv.tax,
            inv.taxType || 'None',
            inv.cgst || 0,
            inv.sgst || 0,
            inv.igst || 0,
            inv.total,
            inv.paymentMethod,
            userId,
            inv.createdAt,
            inv.updatedAt,
          ]
        );
      }
    }

    await AsyncStorage.setItem(`lastSynced_${userId}`, new Date().toISOString());
  },

  sync: async (userId) => {
    if (activeSyncPromise) {
      return activeSyncPromise;
    }

    activeSyncPromise = (async () => {
      const online = await syncService.isOnline();
      if (!online) {
        throw new Error('No internet connection. Sync skipped.');
      }

      const pushResult = await syncService.pushLocalChanges();
      await syncService.pullRemoteChanges(userId);

      const success = pushResult.failed === 0;
      return {
        pushed: pushResult.processed,
        failed: pushResult.failed,
        errors: pushResult.errors,
        success,
      };
    })();

    try {
      return await activeSyncPromise;
    } finally {
      activeSyncPromise = null;
    }
  },

  syncIfEnabled: async (userId) => {
    if (!userId) return null;

    const autoSyncEnabled = await syncService.getAutoSyncEnabled();
    if (!autoSyncEnabled) {
      return null;
    }

    return syncService.sync(userId);
  },
};
