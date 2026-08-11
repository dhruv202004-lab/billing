import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Card, Button, List, Divider } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { pdfService } from '../services/pdfService';
import { safeJsonParse } from '../utils/safeJson';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function InvoiceDetailsScreen({ route }) {
  const { invoice } = route.params;
  const { user } = useContext(AuthContext);

  const [printLayout, setPrintLayout] = useState({
    headerSub: 'Invoice / Bill Summary',
    footerMsg: 'Thank you for your business!',
    showSign: true,
    address: '123 Silicon Valley Road, Bangalore - 560001',
    gstin: '22AAAAA0000A1Z5',
    instagram: '',
    gmail: '',
    contactNumber: '',
    logoImage: null
  });

  useEffect(() => {
    const loadPrintLayout = async () => {
      try {
        const headerSub = await AsyncStorage.getItem('settings_layout_header_sub') || 'Invoice / Bill Summary';
        const footerMsg = await AsyncStorage.getItem('settings_layout_footer_msg') || 'Thank you for your business!';
        const showSignString = await AsyncStorage.getItem('settings_layout_show_sign');
        const showSign = showSignString !== null ? showSignString === 'true' : true;
        const address = await AsyncStorage.getItem('settings_business_address') || '123 Silicon Valley Road, Bangalore - 560001';
        const gstin = await AsyncStorage.getItem('settings_gstin') || '22AAAAA0000A1Z5';
        const instagram = await AsyncStorage.getItem('settings_layout_instagram') || '';
        const gmail = await AsyncStorage.getItem('settings_layout_gmail') || '';
        const contactNumber = await AsyncStorage.getItem('settings_layout_contact_number') || '';
        const logoImage = await AsyncStorage.getItem('settings_layout_logo_image') || null;
        setPrintLayout({ headerSub, footerMsg, showSign, address, gstin, instagram, gmail, contactNumber, logoImage });
      } catch (err) {
        console.log('Error loading print layout in details screen:', err);
      }
    };
    loadPrintLayout();
  }, []);

  const items = safeJsonParse(invoice.items_json, invoice.items || []);
  const subtotal = Number(invoice.subtotal) || 0;
  const discountAmount = Number(invoice.discount) || 0;
  const discountPercent = Number(
    invoice.discount_percentage ??
      invoice.discountPercentage ??
      (subtotal > 0 ? (discountAmount / subtotal) * 100 : 0)
  ) || 0;

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
          {/* Shop Header & Print Layout Details */}
          <View style={{ alignItems: 'center', marginBottom: 15 }}>
            {printLayout.logoImage ? (
              <Image source={{ uri: printLayout.logoImage }} style={{ width: 180, height: 60, resizeMode: 'contain', marginBottom: 4 }} />
            ) : (
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#7a431d', letterSpacing: 1 }}>{user?.shopName || 'SHOP RECEIPT'}</Text>
            )}
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>{printLayout.headerSub}</Text>
            
            <Text style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }}>{printLayout.address}</Text>
            {printLayout.gstin ? (
              <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 }}>GSTIN: {printLayout.gstin}</Text>
            ) : null}
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 2 }}>
              {printLayout.contactNumber || user?.phone ? (
                <Text style={{ fontSize: 10, color: '#64748b', marginRight: 8 }}>📞 {printLayout.contactNumber || user?.phone}</Text>
              ) : null}
              {printLayout.gmail || user?.email ? (
                <Text style={{ fontSize: 10, color: '#64748b' }}>✉️ {printLayout.gmail || user?.email}</Text>
              ) : null}
            </View>
          </View>

          <Divider style={{ marginBottom: 15 }} />

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
                description={`Qty: ${item.quantity} x Rs ${Number(item.price).toFixed(2)}`}
                right={() => <Text style={styles.itemTotal}>Rs {Number(item.total).toFixed(2)}</Text>}
                style={styles.listItem}
              />
              <Divider />
            </View>
          ))}

          <View style={styles.totalsContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.subvalue}>Rs {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Discount ({discountPercent.toFixed(2)}%)</Text>
              <Text style={styles.discount}>-Rs {discountAmount.toFixed(2)}</Text>
            </View>
            {Number(invoice.tax) > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Tax</Text>
                <Text style={styles.subvalue}>+Rs {Number(invoice.tax).toFixed(2)}</Text>
              </View>
            )}
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.row}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>Rs {Number(invoice.total).toFixed(2)}</Text>
            </View>
          </View>

          {/* Social and print layout footer details */}
          <Divider style={{ marginVertical: 12 }} />

          <View style={{ marginBottom: 15 }}>
            {printLayout.instagram ? (
              <Text style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 4 }}>📷 Instagram: {printLayout.instagram}</Text>
            ) : null}
            {printLayout.footerMsg ? (
              <Text style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', lineHeight: 14 }}>{printLayout.footerMsg}</Text>
            ) : null}
            {printLayout.showSign ? (
              <View style={{ alignSelf: 'flex-end', alignItems: 'center', marginTop: 15, width: 100 }}>
                <Divider style={{ width: '100%', backgroundColor: '#64748b', height: 1 }} />
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#64748b', marginTop: 4, letterSpacing: 1 }}>SIGN</Text>
              </View>
            ) : null}
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
