import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, Modal, FlatList, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Card, IconButton, Divider, Portal, Dialog, List, Chip, useTheme } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { syncService } from '../services/syncService';
import { pdfService } from '../services/pdfService';
import { notificationService } from '../services/notificationService';
import { thermalPrintService } from '../services/thermalPrintService';
import { getDB } from '../database/sqlite';
import * as Print from 'expo-print';

export default function POSScreen() {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const isFocused = useIsFocused();

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

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('18'); // default GST is 18%
  const [taxType, setTaxType] = useState('GST'); // 'GST' (CGST+SGST), 'IGST', 'None'
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');

  // Modals/Dialogs
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  const [newInvoice, setNewInvoice] = useState(null);

  // Quick Customer Create State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustDialogVisible, setNewCustDialogVisible] = useState(false);

  // Barcode Camera State
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const getInvoiceDiscountPercent = (invoice) => {
    const subtotalValue = Number(invoice?.subtotal) || 0;
    const storedPercent = invoice?.discount_percentage ?? invoice?.discountPercentage;
    if (storedPercent !== undefined && storedPercent !== null) {
      return Number(storedPercent) || 0;
    }
    const discountValue = Number(invoice?.discount) || 0;
    return subtotalValue > 0 ? (discountValue / subtotalValue) * 100 : 0;
  };

  const loadData = async () => {
    if (!user) return;
    try {
      const p = await dbService.getProducts(user.id);
      const c = await dbService.getCustomers(user.id);
      setProducts(p);
      setCustomers(c);
    } catch (err) {
      console.error(err);
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

  useEffect(() => {
    notificationService.requestPermissions().catch((err) => console.log('Notification permission request error:', err));
  }, []);

  // GST & Totals Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountPercent = Math.max(0, Number(discount) || 0);
  const discountAmt = subtotal * (discountPercent / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmt);

  let taxAmt = 0;
  let cgstAmt = 0;
  let sgstAmt = 0;
  let igstAmt = 0;

  if (taxType === 'GST') {
    const rate = Number(taxRate) || 0;
    taxAmt = taxableAmount * (rate / 100);
    cgstAmt = taxAmt / 2;
    sgstAmt = taxAmt / 2;
  } else if (taxType === 'IGST') {
    const rate = Number(taxRate) || 0;
    taxAmt = taxableAmount * (rate / 100);
    igstAmt = taxAmt;
  }

  const total = Math.max(0, taxableAmount + taxAmt);

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        Alert.alert('Out of Stock', `Cannot add more "${product.name}". Local stock limit reached.`);
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } : item));
    } else {
      if (product.stock <= 0) {
        Alert.alert('Out of Stock', `"${product.name}" has no stock left.`);
        return;
      }
      setCart([...cart, {
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price
      }]);
    }
    setProductModalVisible(false);
    setSearchProductQuery('');
  };

  const updateQuantity = (itemId, change) => {
    const item = cart.find(i => i.id === itemId);
    const prod = products.find(p => p.id === itemId);
    if (!item) return;

    const newQty = item.quantity + change;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.id !== itemId));
    } else {
      if (prod && newQty > prod.stock) {
        Alert.alert('Out of Stock', 'Cannot add more. Local stock limit reached.');
        return;
      }
      setCart(cart.map(i => i.id === itemId ? { ...i, quantity: newQty, total: newQty * i.price } : i));
    }
  };

  const handleQuickCustomerCreate = async () => {
    if (!newCustName || !newCustPhone) return;
    try {
      const cust = await dbService.addCustomer(user.id, { name: newCustName, phone: newCustPhone });
      setCustomers([...customers, cust]);
      setSelectedCustomer(cust);
      syncService.syncIfEnabled(user.id).catch((err) => console.log('Quick customer auto sync failed:', err));
      setNewCustName('');
      setNewCustPhone('');
      setNewCustDialogVisible(false);
      setCustomerModalVisible(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    const matched = products.find(p => p.sku === data);
    if (matched) {
      addToCart(matched);
      Alert.alert('Barcode Scanned', `Added "${matched.name}" to cart.`);
    } else {
      Alert.alert('Barcode Scanned', `Product with SKU "${data}" not found in inventory.`);
    }

    setTimeout(() => setScanned(false), 2000);
  };

  const openBarcodeScanner = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert('Camera Access Required', 'Please enable camera permissions in settings to scan barcodes.');
        return;
      }
    }
    setScannerVisible(true);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart is Empty', 'Please add products to checkout.');
      return;
    }
    try {
      const db = await getDB();
      const invoiceNumber = 'INV-' + Date.now().toString().slice(-6);

      let finalCustomerId = null;
      let finalCustName = selectedCustomer ? selectedCustomer.name : (customCustomerName.trim() || 'Walk-in Customer');
      let finalCustPhone = selectedCustomer ? selectedCustomer.phone : (customCustomerPhone.trim() || '');

      if (selectedCustomer) {
        finalCustomerId = selectedCustomer.id;
        if (paymentMethod === 'Credit') {
          const newBalance = (selectedCustomer.outstanding_balance || 0) + total;
          await dbService.updateCustomer(user.id, selectedCustomer.id, {
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            email: selectedCustomer.email || '',
            outstandingBalance: newBalance
          });
        }
      } else if (finalCustName && finalCustName.toLowerCase() !== 'walk-in customer') {
        // Query if custom customer already exists by phone
        let existingCust = null;
        if (finalCustPhone) {
          existingCust = await db.getFirstAsync('SELECT * FROM customers WHERE phone = ? AND user_id = ?;', [finalCustPhone, user.id]);
        }
        if (existingCust) {
          finalCustomerId = existingCust.id;
          if (paymentMethod === 'Credit') {
            const newBalance = (existingCust.outstanding_balance || 0) + total;
            await dbService.updateCustomer(user.id, existingCust.id, {
              name: existingCust.name,
              phone: existingCust.phone,
              email: existingCust.email || '',
              outstandingBalance: newBalance
            });
          }
        } else {
          // Auto-save new customer to database
          const newCust = await dbService.addCustomer(user.id, {
            name: finalCustName,
            phone: finalCustPhone,
            email: '',
            outstandingBalance: paymentMethod === 'Credit' ? total : 0
          });
          finalCustomerId = newCust.id;
        }
      }

      const invoiceData = {
        invoiceNumber,
        customerId: finalCustomerId,
        customerName: finalCustName,
        customerPhone: finalCustPhone,
        items: cart,
        subtotal,
        discount: discountAmt,
        discountPercentage: discountPercent,
        tax: taxAmt,
        taxType,
        cgst: cgstAmt,
        sgst: sgstAmt,
        igst: igstAmt,
        total,
        paymentMethod
      };

      const inv = await dbService.addInvoice(user.id, invoiceData);
      setNewInvoice(inv);
      syncService.syncIfEnabled(user.id).catch((err) => console.log('Invoice auto sync failed:', err));

      // Low stock notification trigger check
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(c => c.productId === p.id);
        if (cartItem) {
          const finalStock = p.stock - cartItem.quantity;
          if (finalStock <= 5) {
            notificationService.triggerLowStockAlert(p.name, finalStock);
          }
          return { ...p, stock: finalStock };
        }
        return p;
      });
      setProducts(updatedProducts);

      setSuccessDialogVisible(true);

      setCart([]);
      setDiscount('0');
      setTaxRate('18');
      setTaxType('GST');
      setSelectedCustomer(null);
      setCustomCustomerName('');
      setCustomCustomerPhone('');
      setPaymentMethod('Cash');
    } catch (err) {
      console.error(err);
      Alert.alert('Checkout Error', 'Failed to generate invoice.');
    }
  };

  const handleSharePdf = async () => {
    if (!newInvoice || isSharing) return;
    setIsSharing(true);
    try {
      await pdfService.shareInvoicePdf(user.shopName, newInvoice, newInvoice.items, user);
      setSuccessDialogVisible(false);
    } catch (err) {
      console.error(err);
      const errMsg = err.message || '';
      // Only show error if it is not a user cancelation/dismissal rejection
      if (!errMsg.includes('rejected') && !errMsg.includes('cancel') && !errMsg.includes('dismiss')) {
        Alert.alert('PDF Error', 'Failed to generate PDF invoice.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleSystemPrint = async () => {
    if (!newInvoice || isPrinting) return;
    setIsPrinting(true);
    try {
      const db = await getDB();
      const enrichedItems = await Promise.all(newInvoice.items.map(async (item) => {
        const prod = await db.getFirstAsync('SELECT description, brand FROM products WHERE id = ?;', [item.id]);
        return {
          ...item,
          description: prod?.description || '',
          brand: prod?.brand || '',
        };
      }));
      const customerPhone = newInvoice.customer_phone || '';
      const html = pdfService.generateInvoiceHtml(user.shopName, newInvoice, enrichedItems, user, customerPhone);
      await Print.printAsync({ html });
    } catch (err) {
      console.error(err);
      const errMsg = err.message || '';
      if (!errMsg.includes('rejected') && !errMsg.includes('cancel') && !errMsg.includes('dismiss')) {
        Alert.alert('Print Error', 'Failed to open system print dialog.');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleThermalPrint = () => {
    if (!newInvoice) return;
    const printData = thermalPrintService.formatInvoice(user.shopName, newInvoice, newInvoice.items);
    Alert.alert(
      'Thermal Printer Payload',
      'The receipt has been formatted in standard ESC/POS. Preview:\n\n' + printData.substring(0, 150) + '...',
      [
        { text: 'Close' },
        {
          text: 'Send Raw ESC/POS',
          onPress: () => thermalPrintService.printRawSocket('192.168.1.100', 9100, printData)
        }
      ]
    );
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchProductQuery.toLowerCase()))
  );

  return (
    <Portal.Host>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Customer Selection Card */}
        <Card style={[styles.customerCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.customerContent}>
            <View style={styles.customerHeaderRow}>
              <Text style={[styles.custLabel, { color: theme.colors.onSurface + '99' }]}>Customer Details</Text>
              <Button
                mode="text"
                compact
                onPress={() => setCustomerModalVisible(true)}
                textColor={theme.colors.primary}
                icon="account-search-outline"
                labelStyle={{ fontSize: 13, fontWeight: '600' }}
              >
                {selectedCustomer ? 'Change Customer' : 'Select from Directory'}
              </Button>
            </View>

            {selectedCustomer ? (
              <View style={[styles.selectedCustomerBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant }]}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(selectedCustomer.name), marginLeft: 0 }]}>
                  <Text style={styles.avatarText}>{getInitials(selectedCustomer.name)}</Text>
                </View>
                <View style={styles.selectedCustomerDetails}>
                  <Text style={[styles.selectedCustName, { color: theme.colors.onSurface }]}>{selectedCustomer.name}</Text>
                  <Text style={[styles.selectedCustPhone, { color: theme.colors.onSurface + '99' }]}>{selectedCustomer.phone}</Text>
                </View>
                <IconButton
                  icon="close-circle-outline"
                  iconColor="#ef4444"
                  size={22}
                  onPress={() => setSelectedCustomer(null)}
                  style={{ margin: 0 }}
                />
              </View>
            ) : (
              <View style={styles.customCustomerForm}>
                <TextInput
                  placeholder="Customer Name"
                  placeholderTextColor={theme.colors.onSurface + '66'}
                  textColor={theme.colors.onSurface}
                  value={customCustomerName}
                  onChangeText={setCustomCustomerName}
                  mode="outlined"
                  dense
                  style={[styles.customCustomerInput, { backgroundColor: theme.colors.background }]}
                  activeOutlineColor={theme.colors.primary}
                  outlineColor={theme.colors.outlineVariant}
                  left={<TextInput.Icon icon="account-outline" color={theme.colors.onSurface + '88'} size={20} />}
                />
                <TextInput
                  placeholder="Mobile Number "
                  placeholderTextColor={theme.colors.onSurface + '66'}
                  textColor={theme.colors.onSurface}
                  value={customCustomerPhone}
                  onChangeText={setCustomCustomerPhone}
                  keyboardType="phone-pad"
                  mode="outlined"
                  dense
                  style={[styles.customCustomerInput, { marginLeft: 8, backgroundColor: theme.colors.background }]}
                  activeOutlineColor={theme.colors.primary}
                  outlineColor={theme.colors.outlineVariant}
                  left={<TextInput.Icon icon="phone-outline" color={theme.colors.onSurface + '88'} size={20} />}
                />
              </View>
            )}
          </Card.Content>
        </Card>

        {/* POS Cart List Header */}
        <View style={styles.cartHeaderRow}>
          <Text style={[styles.cartTitle, { color: theme.colors.onBackground }]}>Billing Cart ({cart.length} items)</Text>
          <View style={{ flexDirection: 'row' }}>
            <IconButton
              icon="barcode-scan"
              iconColor={theme.colors.primary}
              size={24}
              onPress={openBarcodeScanner}
              style={{ marginRight: 4 }}
            />
            <Button
              icon="plus"
              mode="contained"
              buttonColor={theme.colors.primary}
              onPress={() => setProductModalVisible(true)}
            >
              Add Item
            </Button>
          </View>
        </View>

        {cart.length === 0 ? (
          <View style={styles.emptyCartContainer}>
            <IconButton icon="calculator" size={48} iconColor={theme.colors.onBackground + '44'} />
            <Text style={[styles.emptyCartText, { color: theme.colors.onBackground + '99' }]}>POS terminal ready. Scan or add items to start billing.</Text>
          </View>
        ) : (
          <ScrollView style={[styles.cartList, { backgroundColor: theme.colors.surface }]}>
            {cart.map((item) => (
              <View key={item.id}>
                <View style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: theme.colors.onSurface }]}>{item.name}</Text>
                    <Text style={[styles.itemSub, { color: theme.colors.onSurface + '99' }]}>₹ {item.price.toFixed(2)} each</Text>
                  </View>
                  <View style={[styles.qtyContainer, { borderColor: theme.colors.outlineVariant }]}>
                    <IconButton
                      icon="minus"
                      size={20}
                      iconColor={theme.colors.primary}
                      onPress={() => updateQuantity(item.id, -1)}
                      style={styles.qtyBtn}
                    />
                    <Text style={[styles.qtyText, { color: theme.colors.onSurface }]}>{item.quantity}</Text>
                    <IconButton
                      icon="plus"
                      size={20}
                      iconColor={theme.colors.primary}
                      onPress={() => updateQuantity(item.id, 1)}
                      style={styles.qtyBtn}
                    />
                  </View>
                  <Text style={[styles.itemTotal, { color: theme.colors.onSurface }]}>₹ {item.total.toFixed(2)}</Text>
                </View>
                <Divider />
              </View>
            ))}
          </ScrollView>
        )}

        {/* Calculations and Checkout Footer */}
        <Card style={[styles.footerCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.footerContent}>
            <View style={styles.inputRow}>
              <TextInput
                label="Discount (%)"
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
                mode="outlined"
                dense
                textColor={theme.colors.onSurface}
                style={[styles.calcInput, { flex: 1.2, backgroundColor: theme.colors.background }]}
                activeOutlineColor={theme.colors.primary}
                outlineColor={theme.colors.outlineVariant}
              />
              <TextInput
                label="Tax Rate (%)"
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="numeric"
                mode="outlined"
                dense
                textColor={theme.colors.onSurface}
                style={[styles.calcInput, { flex: 1, backgroundColor: theme.colors.background }]}
                activeOutlineColor={theme.colors.primary}
                outlineColor={theme.colors.outlineVariant}
                disabled={taxType === 'None'}
              />
            </View>

            {/* GST Type Selector */}
            <View style={styles.taxSelectorRow}>
              <Text style={[styles.taxLabel, { color: theme.colors.onSurface + 'b3' }]}>Tax Type:</Text>
              <View style={styles.taxOptions}>
                {['GST', 'IGST', 'None'].map((type) => (
                  <Chip
                    key={type}
                    selected={taxType === type}
                    onPress={() => setTaxType(type)}
                    style={[
                      styles.taxChip, 
                      { backgroundColor: theme.colors.background },
                      taxType === type ? { backgroundColor: theme.colors.primary } : null
                    ]}
                    textStyle={{ color: taxType === type ? '#fff' : theme.colors.primary, fontWeight: '600' }}
                    selectedColor={taxType === type ? '#fff' : theme.colors.primary}
                    showSelectedOverlay={false}
                  >
                    {type}
                  </Chip>
                ))}
              </View>
            </View>

            {/* Payment Method Selector */}
            <View style={styles.paymentContainer}>
              <Text style={[styles.payLabel, { color: theme.colors.onSurface + 'b3' }]}>Payment:</Text>
              <View style={styles.payOptionRow}>
                {['Cash', 'Card', 'UPI', 'Credit'].map((method) => (
                  <Chip
                    key={method}
                    selected={paymentMethod === method}
                    onPress={() => setPaymentMethod(method)}
                    style={[
                      styles.payChip, 
                      { backgroundColor: theme.colors.background },
                      paymentMethod === method ? { backgroundColor: theme.colors.primary } : null
                    ]}
                    textStyle={{ color: paymentMethod === method ? '#fff' : theme.colors.primary, fontWeight: '600' }}
                    selectedColor={paymentMethod === method ? '#fff' : theme.colors.primary}
                    showSelectedOverlay={false}
                  >
                    {method}
                  </Chip>
                ))}
              </View>
            </View>

            <Divider style={{ marginVertical: 8 }} />

            {/* Totals Summary with CGST/SGST/IGST breakouts */}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.onSurface + 'b3' }]}>Subtotal</Text>
              <Text style={[styles.summaryVal, { color: theme.colors.onSurface }]}>₹{subtotal.toFixed(2)}</Text>
            </View>

            {taxType !== 'None' && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.onSurface + 'b3' }]}>Tax ({taxType} {taxRate}%)</Text>
                  <Text style={[styles.summaryVal, { color: theme.colors.onSurface }]}>+₹{taxAmt.toFixed(2)}</Text>
                </View>
                {cgstAmt > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.taxBreakoutLabel, { color: theme.colors.onSurface + '99' }]}>  - CGST</Text>
                    <Text style={[styles.taxBreakoutVal, { color: theme.colors.onSurface + 'cc' }]}>+₹{cgstAmt.toFixed(2)}</Text>
                  </View>
                )}
                {sgstAmt > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.taxBreakoutLabel, { color: theme.colors.onSurface + '99' }]}>  - SGST</Text>
                    <Text style={[styles.taxBreakoutVal, { color: theme.colors.onSurface + 'cc' }]}>+₹{sgstAmt.toFixed(2)}</Text>
                  </View>
                )}
                {igstAmt > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.taxBreakoutLabel, { color: theme.colors.onSurface + '99' }]}>  - IGST</Text>
                    <Text style={[styles.taxBreakoutVal, { color: theme.colors.onSurface + 'cc' }]}>+₹{igstAmt.toFixed(2)}</Text>
                  </View>
                )}
              </>
            )}

            {discountAmt > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.onSurface + 'b3' }]}>Discount ({discountPercent.toFixed(2)}%)</Text>
                <Text style={[styles.summaryVal, { color: 'red' }]}>-₹{discountAmt.toFixed(2)}</Text>
              </View>
            )}

            <View style={[styles.summaryRow, { marginTop: 4 }]}>
              <Text style={[styles.grandLabel, { color: theme.colors.onSurface }]}>Total Amount</Text>
              <Text style={[styles.grandVal, { color: theme.colors.onSurface }]}>₹{total.toFixed(2)}</Text>
            </View>

            <Button
              mode="contained"
              buttonColor={theme.colors.secondary}
              onPress={handleCheckout}
              disabled={cart.length === 0}
              style={styles.checkoutBtn}
              contentStyle={{ paddingVertical: 4 }}
            >
              Generate Bill
            </Button>
          </Card.Content>
        </Card>

        {/* MODAL: Select Customer */}
        <Modal
          visible={customerModalVisible}
          animationType="slide"
          onRequestClose={() => setCustomerModalVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.onBackground }]}>Select Customer</Text>
              <IconButton icon="close" iconColor={theme.colors.onBackground} onPress={() => setCustomerModalVisible(false)} />
            </View>

            <View style={styles.modalActionRow}>
              <Button
                mode="contained"
                buttonColor={theme.colors.primary}
                onPress={() => setSelectedCustomer(null) || setCustomerModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              >
                Walk-in Customer
              </Button>
              <Button
                mode="outlined"
                onPress={() => setNewCustDialogVisible(true)}
                textColor={theme.colors.primary}
                style={{ borderColor: theme.colors.primary }}
              >
                + New Customer
              </Button>
            </View>

            <FlatList
              data={customers}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />}
              renderItem={({ item }) => (
                <List.Item
                  title={item.name}
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description={item.phone}
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  left={() => (
                    <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
                      <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                    </View>
                  )}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerModalVisible(false);
                  }}
                  style={styles.listItem}
                />
              )}
            />
          </View>
        </Modal>

        {/* MODAL: Select Product */}
        <Modal
          visible={productModalVisible}
          animationType="slide"
          onRequestClose={() => setProductModalVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.onBackground }]}>Add Product to Bill</Text>
              <IconButton icon="close" iconColor={theme.colors.onBackground} onPress={() => setProductModalVisible(false)} />
            </View>

            <TextInput
              placeholder="Search by Name or SKU..."
              placeholderTextColor={theme.colors.onSurface + '66'}
              textColor={theme.colors.onSurface}
              value={searchProductQuery}
              onChangeText={setSearchProductQuery}
              mode="outlined"
              style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
              activeOutlineColor={theme.colors.primary}
              outlineColor={theme.colors.outlineVariant}
            />

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />}
              renderItem={({ item }) => (
                <List.Item
                  title={item.name}
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description={`Price: ₹${item.price.toFixed(2)} | Stock: ${item.stock} | SKU: ${item.sku || 'N/A'}`}
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  left={() => (
                    item.image ? (
                      <Image source={{ uri: item.image }} style={styles.listProductImage} />
                    ) : (
                      <List.Icon icon="package-variant-closed" color={theme.colors.primary} />
                    )
                  )}
                  right={() => <IconButton icon="plus-circle-outline" iconColor={theme.colors.primary} />}
                  onPress={() => addToCart(item)}
                  style={styles.listItem}
                />
              )}
            />
          </View>
        </Modal>

        {/* MODAL: Camera Barcode Scanner */}
        <Modal
          visible={scannerVisible}
          animationType="slide"
          onRequestClose={() => setScannerVisible(false)}
        >
          <View style={[styles.cameraContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.onBackground }]}>Scan Item Barcode</Text>
              <IconButton icon="close" iconColor={theme.colors.onBackground} onPress={() => setScannerVisible(false)} />
            </View>
            <CameraView
              style={styles.cameraView}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_a'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <Text style={[styles.cameraTip, { color: theme.colors.onBackground + 'b3' }]}>Align the product barcode within the camera view.</Text>
          </View>
        </Modal>

        {/* DIALOG: Quick Customer Register */}
        <Portal>
          <Dialog visible={newCustDialogVisible} onDismiss={() => setNewCustDialogVisible(false)}>
            <Dialog.Title>Add Customer</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Customer Name"
                value={newCustName}
                onChangeText={setNewCustName}
                mode="outlined"
                style={{ marginBottom: 12 }}
                activeOutlineColor={theme.colors.primary}
              />
              <TextInput
                label="Phone Number"
                value={newCustPhone}
                onChangeText={setNewCustPhone}
                keyboardType="phone-pad"
                mode="outlined"
                activeOutlineColor={theme.colors.primary}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setNewCustDialogVisible(false)}>Cancel</Button>
              <Button onPress={handleQuickCustomerCreate}>Create & Select</Button>
            </Dialog.Actions>
          </Dialog>

          {/* MODAL: Success Invoice Preview & Actions */}
          <Modal
            visible={successDialogVisible}
            animationType="slide"
            onRequestClose={() => setSuccessDialogVisible(false)}
          >
            <View style={[styles.previewModalContainer, { backgroundColor: theme.colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.onBackground }]}>Bill Preview</Text>
                <IconButton icon="close" iconColor={theme.colors.onBackground} onPress={() => setSuccessDialogVisible(false)} />
              </View>

              <ScrollView contentContainerStyle={styles.receiptScrollContent}>
                <Card style={[styles.receiptCard, { backgroundColor: theme.colors.surface }]}>
                  <Card.Content>
                    <Text style={[styles.receiptShopName, { color: theme.colors.onSurface }]}>{user?.shopName || 'SHOP RECEIPT'}</Text>
                    <Text style={[styles.receiptShopSub, { color: theme.colors.onSurface + 'b3' }]}>Invoice / Bill Summary</Text>

                    <Divider style={styles.dashedDivider} />

                    <View style={styles.receiptMetaRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.receiptMetaLabel, { color: theme.colors.onSurface + '99' }]}>Bill No:</Text>
                        <Text style={[styles.receiptMetaVal, { color: theme.colors.onSurface }]}>{newInvoice?.invoice_number}</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={[styles.receiptMetaLabel, { color: theme.colors.onSurface + '99' }]}>Date & Time:</Text>
                        <Text style={[styles.receiptMetaVal, { color: theme.colors.onSurface }]}>
                          {newInvoice?.created_at ? new Date(newInvoice.created_at).toLocaleString() : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.receiptMetaRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.receiptMetaLabel, { color: theme.colors.onSurface + '99' }]}>Customer:</Text>
                        <Text style={[styles.receiptMetaVal, { color: theme.colors.onSurface }]}>{newInvoice?.customer_name}</Text>
                        {newInvoice?.customer_phone ? (
                          <Text style={[styles.receiptMetaVal, { color: theme.colors.onSurface }]}>{newInvoice.customer_phone}</Text>
                        ) : null}
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={[styles.receiptMetaLabel, { color: theme.colors.onSurface + '99' }]}>Payment Method:</Text>
                        <Text style={[styles.receiptMetaVal, { color: theme.colors.onSurface }]}>{newInvoice?.payment_method}</Text>
                      </View>
                    </View>

                    <Divider style={styles.dashedDivider} />

                    <Text style={[styles.receiptSectionTitle, { color: theme.colors.onSurface }]}>Items Purchased</Text>
                    {newInvoice?.items?.map((item, idx) => (
                      <View key={idx} style={styles.receiptItemRow}>
                        <View style={{ flex: 2 }}>
                          <Text style={[styles.receiptItemName, { color: theme.colors.onSurface }]}>{item.name}</Text>
                        </View>
                        <View style={{ flex: 1.5, alignItems: 'center' }}>
                          <Text style={[styles.receiptItemDetail, { color: theme.colors.onSurface + 'b3' }]}>{item.quantity} x ₹{item.price.toFixed(2)}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text style={[styles.receiptItemTotal, { color: theme.colors.onSurface }]}>₹{item.total.toFixed(2)}</Text>
                        </View>
                      </View>
                    ))}

                    <Divider style={styles.dashedDivider} />

                    <View style={styles.receiptTotalRow}>
                      <Text style={[styles.receiptTotalLabel, { color: theme.colors.onSurface + 'b3' }]}>Subtotal</Text>
                      <Text style={[styles.receiptTotalVal, { color: theme.colors.onSurface }]}>₹{newInvoice?.subtotal?.toFixed(2)}</Text>
                    </View>

                    {newInvoice?.discount > 0 && (
                      <View style={styles.receiptTotalRow}>
                        <Text style={[styles.receiptTotalLabel, { color: theme.colors.onSurface + 'b3' }]}>Discount ({getInvoiceDiscountPercent(newInvoice).toFixed(2)}%)</Text>
                        <Text style={[styles.receiptTotalVal, { color: '#ef4444' }]}>-₹{newInvoice?.discount?.toFixed(2)}</Text>
                      </View>
                    )}

                    {newInvoice?.tax > 0 && (
                      <View style={styles.receiptTotalRow}>
                        <Text style={[styles.receiptTotalLabel, { color: theme.colors.onSurface + 'b3' }]}>Tax ({newInvoice?.tax_type})</Text>
                        <Text style={[styles.receiptTotalVal, { color: theme.colors.onSurface }]}>+₹{newInvoice?.tax?.toFixed(2)}</Text>
                      </View>
                    )}

                    <Divider style={{ marginVertical: 8, backgroundColor: theme.colors.outlineVariant }} />

                    <View style={styles.receiptGrandRow}>
                      <Text style={[styles.receiptGrandLabel, { color: theme.colors.onSurface }]}>GRAND TOTAL</Text>
                      <Text style={[styles.receiptGrandVal, { color: theme.colors.onSurface }]}>₹{newInvoice?.total?.toFixed(2)}</Text>
                    </View>
                  </Card.Content>
                </Card>
              </ScrollView>

              <View style={[styles.previewFooter, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
                <View style={styles.footerActionRow}>
                  <Button
                    mode="contained"
                    buttonColor="#25d366"
                    onPress={handleSharePdf}
                    style={[styles.footerActionBtn, { flex: 1, marginRight: 8 }]}
                    icon="whatsapp"
                    textColor="#fff"
                  >
                    Send Bill
                  </Button>
                  <Button
                    mode="contained"
                    buttonColor={theme.colors.primary}
                    onPress={handleSystemPrint}
                    style={[styles.footerActionBtn, { flex: 1 }]}
                    icon="printer"
                  >
                    Print Bill
                  </Button>
                </View>

                <Button
                  mode="outlined"
                  onPress={handleThermalPrint}
                  style={{ borderColor: theme.colors.primary, marginTop: 10 }}
                  textColor={theme.colors.primary}
                  icon="receipt"
                >
                  Print Thermal Receipt
                </Button>

                <Button
                  mode="text"
                  onPress={() => setSuccessDialogVisible(false)}
                  style={{ marginTop: 6 }}
                  textColor={theme.colors.primary}
                >
                  Done & Close
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>
      </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5fa',
    padding: 16,
    paddingTop: 50,
  },
  customerCard: {
    backgroundColor: '#fff',
    elevation: 2,
    borderRadius: 12,
    marginBottom: 16,
  },
  customerContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedCustomerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  selectedCustomerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  selectedCustName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  selectedCustPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  customCustomerForm: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customCustomerInput: {
    flex: 1,
    backgroundColor: '#fff',
    height: 42,
    fontSize: 13,
  },
  custLabel: {
    fontSize: 12,
    color: '#888',
  },
  custName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  changeCustBtn: {
    borderRadius: 8,
  },
  cartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 30,
  },
  cartList: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 1,
    marginBottom: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  itemSub: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  qtyBtn: {
    margin: 0,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    width: 70,
    textAlign: 'right',
  },
  footerCard: {
    backgroundColor: '#fff',
    elevation: 4,
    borderRadius: 16,
  },
  footerContent: {
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calcInput: {
    marginHorizontal: 2,
    backgroundColor: '#fff',
  },
  taxSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  taxLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    width: 70,
  },
  taxOptions: {
    flexDirection: 'row',
  },
  taxChip: {
    marginHorizontal: 2,
    backgroundColor: '#f0f0f8',
    height: 32,
  },
  selectedChip: {
    backgroundColor: '#5a4bda',
  },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  payLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    width: 70,
  },
  payOptionRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  payChip: {
    marginHorizontal: 2,
    marginVertical: 2,
    backgroundColor: '#f0f0f8',
    height: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1.5,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#777',
  },
  summaryVal: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  taxBreakoutLabel: {
    fontSize: 12,
    color: '#999',
  },
  taxBreakoutVal: {
    fontSize: 12,
    color: '#888',
  },
  grandLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5a4bda',
  },
  grandVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5a4bda',
  },
  checkoutBtn: {
    marginTop: 8,
    borderRadius: 8,
  },
  actionBtn: {
    borderRadius: 8,
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalActionRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 40,
  },
  cameraView: {
    flex: 1,
    marginVertical: 20,
  },
  cameraTip: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  listProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignSelf: 'center',
    marginLeft: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
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
  previewModalContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingTop: 10,
  },
  receiptScrollContent: {
    padding: 16,
  },
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  receiptShopName: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#7a431d',
    letterSpacing: 1,
  },
  receiptShopSub: {
    fontSize: 12,
    textAlign: 'center',
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  dashedDivider: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 1,
    borderColor: '#cbd5e1',
    marginVertical: 14,
    height: 0,
  },
  receiptMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  receiptMetaLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  receiptMetaVal: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  receiptSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7a431d',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  receiptItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  receiptItemDetail: {
    fontSize: 12,
    color: '#64748b',
  },
  receiptItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  receiptTotalLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  receiptTotalVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  receiptGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  receiptGrandLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#5a4bda',
  },
  receiptGrandVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#5a4bda',
  },
  previewFooter: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    elevation: 8,
  },
  footerActionRow: {
    flexDirection: 'row',
  },
  footerActionBtn: {
    borderRadius: 10,
    paddingVertical: 4,
  },
});
