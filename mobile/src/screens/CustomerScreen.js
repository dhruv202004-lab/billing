import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, Linking, Platform } from 'react-native';
import { Text, TextInput, Button, Divider, FAB, Portal, Dialog, IconButton, Card, useTheme } from 'react-native-paper';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { syncService } from '../services/syncService';
import { getDB } from '../database/sqlite';

export default function CustomerScreen() {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [customerDialogVisible, setCustomerDialogVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('0');

  const loadCustomers = async () => {
    if (!user) return;
    try {
      const db = await getDB();
      const rawCustomers = await dbService.getCustomers(user.id);

      // Enriched customer data with invoice count and sum of totals from SQLite
      const enriched = await Promise.all(
        rawCustomers.map(async (cust) => {
          const stats = await db.getFirstAsync(
            'SELECT COUNT(*) as count, SUM(total) as total_spent FROM invoices WHERE customer_id = ?;',
            [cust.id]
          );
          return {
            ...cust,
            invoiceCount: stats?.count || 0,
            totalSpent: stats?.total_spent || 0,
          };
        })
      );

      setCustomers(enriched);
    } catch (err) {
      console.error('Error loading customers ledger:', err);
    }
  };

  useEffect(() => {
    if (isFocused && user) {
      loadCustomers();
      syncService.syncIfEnabled(user.id)
        .then(() => loadCustomers())
        .catch(err => console.log('Auto background sync failed:', err));
    }
  }, [isFocused, user]);

  const openAddDialog = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setOutstandingBalance('0');
    setCustomerDialogVisible(true);
  };

  const openEditDialog = (cust) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setOutstandingBalance(cust.outstanding_balance.toString());
    setCustomerDialogVisible(true);
  };

  const handleSaveCustomer = async () => {
    if (!name || !phone) {
      Alert.alert('Missing fields', 'Name and Phone Number are required');
      return;
    }

    const customerData = {
      name,
      phone,
      email,
      outstandingBalance: Number(outstandingBalance),
    };

    try {
      if (editingCustomer) {
        const updated = await dbService.updateCustomer(user.id, editingCustomer.id, customerData);
        setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...updated, invoiceCount: editingCustomer.invoiceCount, totalSpent: editingCustomer.totalSpent } : c));
      } else {
        const created = await dbService.addCustomer(user.id, customerData);
        setCustomers([...customers, { ...created, invoiceCount: 0, totalSpent: 0 }]);
      }
      syncService.syncIfEnabled(user.id).catch((err) => console.log('Customer auto sync failed:', err));
      setCustomerDialogVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Save Error', 'Failed to save customer details.');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.deleteCustomer(customerId);
              setCustomers(customers.filter(c => c.id !== customerId));
              syncService.syncIfEnabled(user.id).catch((err) => console.log('Customer delete auto sync failed:', err));
            } catch (err) {
              console.error(err);
              Alert.alert('Delete Error', 'Failed to delete customer.');
            }
          }
        }
      ]
    );
  };

  const handleMessage = (item) => {
    const cleanPhone = item.phone.replace(/[^0-9+]/g, '');
    const reminderMsg = item.outstanding_balance > 0 
      ? `Hello ${item.name}, this is a reminder from ${user?.shopName || 'our shop'}. Your outstanding balance is ₹${item.outstanding_balance}. Kindly clear it at your earliest convenience.`
      : `Hello ${item.name}, thank you for choosing ${user?.shopName || 'our shop'}! We appreciate your continued business.`;

    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(reminderMsg)}`;
    const smsUrl = `sms:${cleanPhone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(reminderMsg)}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Linking.openURL(smsUrl).catch(() => {
        Alert.alert('Error', 'Could not open WhatsApp or SMS on this device.');
      });
    });
  };

  const getAvatarColor = (name) => {
    const colors = ['#00bfa5', '#3f51b5', '#ff5722', '#673ab7', '#e91e63', '#795548', '#2196f3', '#4caf50'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
  };

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Portal.Host>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>Customer Directory</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onBackground + '99' }]}>Manage your customer database and billing history.</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search by name or mobile.."
            placeholderTextColor={theme.colors.onSurface + '66'}
            textColor={theme.colors.onSurface}
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
            activeOutlineColor={theme.colors.primary}
            outlineColor={theme.colors.outlineVariant}
            dense
            left={<TextInput.Icon icon="magnify" color={theme.colors.onSurface + '88'} />}
          />
          <View style={styles.filterBtn}>
            <IconButton icon="filter-variant" size={24} iconColor={theme.colors.onBackground} onPress={loadCustomers} />
          </View>
        </View>

        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.onBackground + '80' }]}>No customers found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            renderItem={({ item }) => (
              <Card style={[styles.customerCard, { backgroundColor: theme.colors.surface }]}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
                      <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                    </View>

                    <View style={styles.detailsContainer}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>{item.name}</Text>
                        <View style={styles.editDeleteContainer}>
                          <IconButton
                            icon="pencil-outline"
                            size={16}
                            iconColor={theme.colors.primary}
                            onPress={() => openEditDialog(item)}
                            style={styles.iconBtn}
                          />
                          <IconButton
                            icon="delete-outline"
                            size={16}
                            iconColor="#d32f2f"
                            onPress={() => handleDeleteCustomer(item.id)}
                            style={styles.iconBtn}
                          />
                        </View>
                      </View>
                      
                      <View style={styles.phoneRow}>
                        <IconButton
                          icon="phone-outline"
                          size={13}
                          iconColor={theme.colors.onSurface + '88'}
                          style={styles.phoneIcon}
                        />
                        <Text style={[styles.phoneText, { color: theme.colors.onSurface + 'cc' }]}>{item.phone}</Text>
                      </View>
                    </View>

                    <View style={styles.metricsContainer}>
                      {item.outstanding_balance > 0 ? (
                        <View style={styles.alignRight}>
                          <Text style={styles.outstandingLabel}>Outstanding</Text>
                          <Text style={styles.outstandingValue}>₹{Number(item.outstanding_balance).toLocaleString('en-IN')} Due</Text>
                        </View>
                      ) : (
                        <View style={styles.alignRight}>
                          <Text style={[styles.invoicesLabel, { color: theme.colors.onSurface + 'aa' }]}>{item.invoiceCount} Invoices</Text>
                          <Text style={[styles.totalBilledLabel, { color: theme.colors.onSurface }]}>₹{Number(item.totalSpent).toLocaleString('en-IN')} Total</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.cardBottomRow}>
                    <Button
                      mode="contained-tonal"
                      icon="message-text-outline"
                      onPress={() => handleMessage(item)}
                      style={styles.actionBtn}
                      labelStyle={styles.actionBtnLabel}
                      buttonColor="#f5f5fa"
                      textColor="#4f566b"
                    >
                      Message
                    </Button>
                    <Button
                      mode="contained-tonal"
                      icon="receipt-outline"
                      onPress={() => navigation.navigate('InvoiceHistory', { customerId: item.id, customerName: item.name })}
                      style={styles.actionBtn}
                      labelStyle={styles.actionBtnLabel}
                      buttonColor="#f5f5fa"
                      textColor="#4f566b"
                    >
                      Bill History
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            )}
          />
        )}

        <FAB
          icon="account-plus-outline"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={openAddDialog}
          color="#fff"
        />

        <Portal>
          <Dialog visible={customerDialogVisible} onDismiss={() => setCustomerDialogVisible(false)}>
            <Dialog.Title>{editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}</Dialog.Title>
            <Dialog.Content>
              <ScrollView style={{ maxHeight: 350 }} keyboardShouldPersistTaps="handled">
                <TextInput
                  label="Customer Name"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.dialogInput}
                  activeOutlineColor="#5a4bda"
                />
                <TextInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  mode="outlined"
                  style={styles.dialogInput}
                  activeOutlineColor="#5a4bda"
                />
                <TextInput
                  label="Email (Optional)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  mode="outlined"
                  style={styles.dialogInput}
                  activeOutlineColor="#5a4bda"
                />
                <TextInput
                  label="Outstanding Balance (₹)"
                  value={outstandingBalance}
                  onChangeText={setOutstandingBalance}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.dialogInput}
                  activeOutlineColor="#5a4bda"
                />
              </ScrollView>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setCustomerDialogVisible(false)}>Cancel</Button>
              <Button onPress={handleSaveCustomer}>Save</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    paddingTop: 50,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    height: 48,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardContent: {
    padding: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  editDeleteContainer: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  iconBtn: {
    margin: 0,
    padding: 0,
    width: 24,
    height: 24,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  phoneIcon: {
    margin: 0,
    padding: 0,
    width: 16,
    height: 16,
  },
  phoneText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 2,
  },
  metricsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  outstandingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outstandingValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 2,
  },
  invoicesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalBilledLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  actionBtn: {
    flex: 0.48,
    borderRadius: 8,
  },
  actionBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  dialogInput: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
});
