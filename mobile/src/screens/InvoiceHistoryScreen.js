import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, TextInput, Divider, List, IconButton } from 'react-native-paper';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/dbService';

export default function InvoiceHistoryScreen({ route }) {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const customerId = route.params?.customerId;
  const customerName = route.params?.customerName;

  const loadInvoices = async () => {
    if (!user) return;
    try {
      const invs = await dbService.getInvoices(user.id);
      if (customerId) {
        setInvoices(invs.filter(inv => inv.customer_id === customerId));
      } else {
        setInvoices(invs);
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadInvoices();
    }
  }, [isFocused, customerId]);

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clearFilter = () => {
    navigation.setParams({ customerId: undefined, customerName: undefined });
  };

  return (
    <View style={styles.container}>
      {customerName && (
        <View style={styles.filterBanner}>
          <View style={styles.filterBannerTextContainer}>
            <List.Icon icon="account-filter-outline" color="#5a4bda" style={styles.filterBannerIcon} />
            <Text style={styles.filterBannerText}>
              Invoices for <Text style={styles.boldText}>{customerName}</Text>
            </Text>
          </View>
          <IconButton
            icon="close-circle"
            size={22}
            iconColor="#ef4444"
            onPress={clearFilter}
            style={styles.clearBtn}
          />
        </View>
      )}

      <TextInput
        placeholder="Search by Invoice # or Customer..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        mode="outlined"
        style={styles.searchBar}
        activeOutlineColor="#5a4bda"
        outlineColor="#cbd5e1"
        dense
        left={<TextInput.Icon icon="magnify" color="#777" />}
      />

      {filteredInvoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No invoices found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={Divider}
          renderItem={({ item }) => (
            <List.Item
              title={`# ${item.invoice_number}`}
              description={`Customer: ${item.customer_name} | ${new Date(item.created_at).toLocaleDateString()}`}
              right={() => <Text style={styles.invoiceAmount}>₹{Number(item.total).toLocaleString('en-IN')}</Text>}
              left={() => <List.Icon icon="receipt" color="#5a4bda" />}
              onPress={() => navigation.navigate('InvoiceDetails', { invoice: item })}
              style={styles.listItem}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  filterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
  },
  filterBannerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterBannerIcon: {
    margin: 0,
    marginRight: 6,
    padding: 0,
    width: 24,
    height: 24,
  },
  filterBannerText: {
    fontSize: 14,
    color: '#1e3a8a',
  },
  boldText: {
    fontWeight: 'bold',
  },
  clearBtn: {
    margin: 0,
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 4,
    elevation: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  invoiceAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    alignSelf: 'center',
    color: '#0f172a',
    marginRight: 10,
  },
});
