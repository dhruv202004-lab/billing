import React, { useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, List, Divider } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { pdfService } from '../services/pdfService';

export default function InvoiceDetailsScreen({ route }) {
  const { invoice } = route.params;
  const { user } = useContext(AuthContext);

  const items = typeof invoice.items_json === 'string' ? JSON.parse(invoice.items_json) : (invoice.items || []);

  const handleSharePdf = async () => {
    try {
      await pdfService.shareInvoicePdf(user.shopName, invoice, items, user);
    } catch (err) {
      console.error(err);
      Alert.alert('PDF Error', 'Failed to compile or share the invoice PDF.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Number</Text>
            <Text style={styles.value}># {invoice.invoice_number}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{new Date(invoice.created_at).toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Customer Name</Text>
            <Text style={styles.value}>
              {invoice.customer_name} {invoice.customer_phone ? `(${invoice.customer_phone})` : ''}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>{invoice.payment_method}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sync Status</Text>
            <Text style={[styles.value, invoice.sync_status === 'synced' ? styles.synced : styles.pending]}>
              {invoice.sync_status}
            </Text>
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Items Purchased</Text>
          {items.map((item, idx) => (
            <View key={idx}>
              <List.Item
                title={item.name}
                description={`Qty: ${item.quantity} x ₹${Number(item.price).toFixed(2)}`}
                right={() => <Text style={styles.itemTotal}>₹{Number(item.total).toFixed(2)}</Text>}
                style={styles.listItem}
              />
              <Divider />
            </View>
          ))}

          <View style={styles.totalsContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.subvalue}>₹{Number(invoice.subtotal).toFixed(2)}</Text>
            </View>
            {Number(invoice.discount) > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Discount</Text>
                <Text style={styles.discount}>-₹{Number(invoice.discount).toFixed(2)}</Text>
              </View>
            )}
            {Number(invoice.tax) > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Tax</Text>
                <Text style={styles.subvalue}>+₹{Number(invoice.tax).toFixed(2)}</Text>
              </View>
            )}
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.row}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>₹{Number(invoice.total).toFixed(2)}</Text>
            </View>
          </View>

          <Button
            mode="contained"
            buttonColor="#5a4bda"
            onPress={handleSharePdf}
            style={styles.btn}
            icon="share-variant"
          >
            Share PDF Receipt
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5fa',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    elevation: 3,
    borderRadius: 16,
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    color: '#777',
    fontSize: 14,
  },
  value: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  synced: {
    color: '#2ecc71',
  },
  pending: {
    color: '#f39c12',
  },
  divider: {
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 8,
  },
  listItem: {
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'center',
    color: '#333',
  },
  totalsContainer: {
    marginTop: 16,
    backgroundColor: '#fbfbfe',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8f8',
  },
  subvalue: {
    fontWeight: '500',
    color: '#333',
  },
  discount: {
    fontWeight: '500',
    color: '#d32f2f',
  },
  grandLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5a4bda',
  },
  grandValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5a4bda',
  },
  btn: {
    marginTop: 20,
    borderRadius: 8,
  },
});
