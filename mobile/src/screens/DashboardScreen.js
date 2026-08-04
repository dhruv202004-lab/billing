import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, List, Divider, Button, useTheme } from 'react-native-paper';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { syncService } from '../services/syncService';

export default function DashboardScreen() {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    invoiceCount: 0,
    lowStockCount: 0,
    syncQueueCount: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  const loadData = async () => {
    if (!user) return;
    try {
      const products = await dbService.getProducts(user.id);
      const invoices = await dbService.getInvoices(user.id);
      const queue = await dbService.getSyncQueue();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let todaySales = 0;
      let todayInvoiceCount = 0;

      invoices.forEach((inv) => {
        const invDate = new Date(inv.created_at);
        if (invDate >= today) {
          todaySales += inv.total;
          todayInvoiceCount++;
        }
      });

      const lowStock = products.filter((p) => p.stock <= 5);

      setMetrics({
        todaySales,
        invoiceCount: invoices.length,
        lowStockCount: lowStock.length,
        syncQueueCount: queue.length,
      });

      setRecentInvoices(invoices.slice(0, 3));
      setLowStockProducts(lowStock.slice(0, 3));
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused && user) {
      loadData();
      syncService.syncIfEnabled(user.id)
        .then(() => loadData())
        .catch(err => console.log('Auto background sync failed:', err));
    }
  }, [isFocused, user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.welcomeBanner}>
          <Text style={[styles.welcomeTitle, { color: theme.colors.onBackground + 'b3' }]}>Welcome back,</Text>
          <Text style={[styles.shopName, { color: theme.colors.primary }]}>{user?.shopName || 'My Shop'}</Text>
          <Text style={[styles.ownerSub, { color: theme.colors.onBackground + '80' }]}>Category: {user?.shopCategory} | Owner: {user?.ownerName}</Text>
        </View>

        {metrics.syncQueueCount > 0 && (
          <Card style={styles.syncAlertCard}>
            <Card.Content style={styles.syncAlertContent}>
              <Text style={styles.syncAlertText}>
                ⚠️ {metrics.syncQueueCount} billing operations pending database sync.
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.grid}>
          <Card style={[styles.gridCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurface + '99' }]}>Today's Sales</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>₹{metrics.todaySales.toFixed(2)}</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.gridCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurface + '99' }]}>Total Bills</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{metrics.invoiceCount}</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.grid}>
          <Card style={[styles.gridCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurface + '99' }]}>Low Stock Items</Text>
              <Text style={[styles.metricValue, metrics.lowStockCount > 0 ? styles.alertValue : { color: theme.colors.onSurface }]}>
                {metrics.lowStockCount}
              </Text>
            </Card.Content>
          </Card>
          <Card style={[styles.gridCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurface + '99' }]}>Offline Changes</Text>
              <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{metrics.syncQueueCount}</Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Recent Invoices</Text>
              <Button 
                mode="text" 
                compact 
                textColor={theme.colors.primary} 
                onPress={() => navigation.navigate('InvoiceHistory')}
              >
                View All
              </Button>
            </View>
            <Divider style={styles.divider} />
            {recentInvoices.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.onSurface + '80' }]}>No invoices created yet.</Text>
            ) : (
              recentInvoices.map((inv) => (
                <View key={inv.id}>
                  <List.Item
                    title={`# ${inv.invoice_number}`}
                    titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                    description={`Customer: ${inv.customer_name} | ${inv.payment_method}`}
                    descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                    right={() => <Text style={[styles.invoiceAmount, { color: theme.colors.onSurface }]}>₹{Number(inv.total).toFixed(2)}</Text>}
                    onPress={() => navigation.navigate('InvoiceDetails', { invoice: inv })}
                    style={styles.listItem}
                  />
                  <Divider />
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.sectionCard, styles.bottomSpace, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Low Stock Alerts</Text>
            <Divider style={styles.divider} />
            {lowStockProducts.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.onSurface + '80' }]}>All products are well stocked.</Text>
            ) : (
              lowStockProducts.map((p) => (
                <View key={p.id}>
                  <List.Item
                    title={p.name}
                    titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                    description={`SKU: ${p.sku || 'N/A'} | Price: ₹${p.price.toFixed(2)}`}
                    descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                    right={() => (
                      <Text style={styles.stockCountAlert}>
                        {p.stock} units left
                      </Text>
                    )}
                    style={styles.listItem}
                  />
                  <Divider />
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5fa',
  },
  scrollContainer: {
    padding: 16,
    paddingTop: 50,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeBanner: {
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 16,
    color: '#666',
  },
  shopName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#5a4bda',
    marginTop: 2,
  },
  ownerSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  syncAlertCard: {
    backgroundColor: '#fff9e6',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginBottom: 16,
    borderRadius: 8,
  },
  syncAlertContent: {
    paddingVertical: 10,
  },
  syncAlertText: {
    color: '#d6a000',
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  metricLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  alertValue: {
    color: '#d32f2f',
  },
  sectionCard: {
    marginTop: 16,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
  },
  divider: {
    marginVertical: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginVertical: 10,
    fontSize: 14,
  },
  listItem: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  invoiceAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    alignSelf: 'center',
    color: '#333',
  },
  stockCountAlert: {
    fontSize: 13,
    color: '#d32f2f',
    fontWeight: '600',
    alignSelf: 'center',
  },
  bottomSpace: {
    marginBottom: 40,
  },
});
