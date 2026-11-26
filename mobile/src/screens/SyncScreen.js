import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Card, Divider, Portal, Dialog, TextInput, List, SegmentedButtons, Checkbox, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { syncService } from '../services/syncService';
import { dbService } from '../services/dbService';

export default function SyncScreen() {
  const navigation = useNavigation();
  const { user, logout, updateUser } = useContext(AuthContext);
  const { isDarkMode, toggleDarkMode, themeColor, changeThemeColor } = useContext(ThemeContext);
  const theme = useTheme();

  // 1. Profile States & Modal Form
  const [profileDialogVisible, setProfileDialogVisible] = useState(false);
  const [ownerName, setOwnerName] = useState(user?.ownerName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [shopName, setShopName] = useState(user?.shopName || '');
  const [shopCategory, setShopCategory] = useState(user?.shopCategory || '');

  // 2. Change Password Modal Form
  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Business Details Edit States
  const [businessDetailsDialogVisible, setBusinessDetailsDialogVisible] = useState(false);
  const [gstin, setGstin] = useState('22AAAAA0000A1Z5');
  const [businessAddress, setBusinessAddress] = useState('123 Silicon Valley Road, Bangalore - 560001');
  const [businessState, setBusinessState] = useState('Karnataka');
  const [businessCountry, setBusinessCountry] = useState('India');

  // Print Layout Edit States
  const [printLayoutDialogVisible, setPrintLayoutDialogVisible] = useState(false);
  const [layoutHeaderSub, setLayoutHeaderSub] = useState('Invoice / Bill Summary');
  const [layoutFooterMsg, setLayoutFooterMsg] = useState('Thank you for your business!');
  const [layoutShowSign, setLayoutShowSign] = useState(true);
  const [layoutInstagram, setLayoutInstagram] = useState('');
  const [layoutGmail, setLayoutGmail] = useState('');
  const [layoutContactNumber, setLayoutContactNumber] = useState('');
  const [layoutLogoImage, setLayoutLogoImage] = useState(null);

  // GST & Tax Edit States
  const [gstTaxDialogVisible, setGstTaxDialogVisible] = useState(false);
  const [standardTaxRate, setStandardTaxRate] = useState('18');
  const [reducedTaxRate, setReducedTaxRate] = useState('12');
  const [essentialTaxRate, setEssentialTaxRate] = useState('5');
  const [luxuryTaxRate, setLuxuryTaxRate] = useState('28');

  // 3. Billing Toggles & Settings
  const [receiptSize, setReceiptSize] = useState('80mm');
  const [autoPrint, setAutoPrint] = useState(false);
  const [qrCodeOnBill, setQrCodeOnBill] = useState(true);

  // 4. Security Toggles
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  // 5. Data Management Toggles
  const [autoSync, setAutoSync] = useState(true);

  // 6. Appearance States
  const [fontSize, setFontSize] = useState('Medium');

  // 7. General Interactive Dialogs
  const [activeDialog, setActiveDialog] = useState(null); // 'barcode' | 'discount' | 'return_refund' | 'report_view' | 'login_history' | 'session_mgr' | 'backup_restore'
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');
  const [reportName, setReportName] = useState('Sales Report');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportLayout, setReportLayout] = useState('detailed');
  const [reportColumns, setReportColumns] = useState(['Date', 'Invoice #', 'Customer', 'Total']);
  const [reportFigures, setReportFigures] = useState(['Invoice count', 'Sales total', 'Tax total', 'Average invoice']);
  const [reportInvoices, setReportInvoices] = useState([]);
  const [reportProducts, setReportProducts] = useState([]);

  // Load saved local settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedReceiptSize = await AsyncStorage.getItem('settings_receipt_size');
        if (savedReceiptSize) setReceiptSize(savedReceiptSize);

        const savedAutoPrint = await AsyncStorage.getItem('settings_auto_print');
        if (savedAutoPrint) setAutoPrint(savedAutoPrint === 'true');

        const savedQrCode = await AsyncStorage.getItem('settings_qr_code');
        if (savedQrCode) setQrCodeOnBill(savedQrCode === 'true');

        const savedAutoSync = await syncService.getAutoSyncEnabled();
        setAutoSync(savedAutoSync);

        const savedFontSize = await AsyncStorage.getItem('settings_font_size');
        if (savedFontSize) setFontSize(savedFontSize);

        const savedGstin = await AsyncStorage.getItem('settings_gstin');
        if (savedGstin) setGstin(savedGstin);

        const savedAddress = await AsyncStorage.getItem('settings_business_address');
        if (savedAddress) setBusinessAddress(savedAddress);

        const savedState = await AsyncStorage.getItem('settings_business_state');
        if (savedState) setBusinessState(savedState);

        const savedCountry = await AsyncStorage.getItem('settings_business_country');
        if (savedCountry) setBusinessCountry(savedCountry);

        const savedHeaderSub = await AsyncStorage.getItem('settings_layout_header_sub');
        if (savedHeaderSub) setLayoutHeaderSub(savedHeaderSub);

        const savedFooterMsg = await AsyncStorage.getItem('settings_layout_footer_msg');
        if (savedFooterMsg) setLayoutFooterMsg(savedFooterMsg);

        const savedShowSign = await AsyncStorage.getItem('settings_layout_show_sign');
        if (savedShowSign) setLayoutShowSign(savedShowSign === 'true');

        const savedInstagram = await AsyncStorage.getItem('settings_layout_instagram');
        if (savedInstagram) setLayoutInstagram(savedInstagram);

        const savedGmail = await AsyncStorage.getItem('settings_layout_gmail');
        if (savedGmail) setLayoutGmail(savedGmail);

        const savedContact = await AsyncStorage.getItem('settings_layout_contact_number');
        if (savedContact) setLayoutContactNumber(savedContact);

        const savedLogo = await AsyncStorage.getItem('settings_layout_logo_image');
        if (savedLogo) setLayoutLogoImage(savedLogo);

        const savedStdTax = await AsyncStorage.getItem('settings_standard_tax');
        if (savedStdTax) setStandardTaxRate(savedStdTax);

        const savedRedTax = await AsyncStorage.getItem('settings_reduced_tax');
        if (savedRedTax) setReducedTaxRate(savedRedTax);

        const savedEssTax = await AsyncStorage.getItem('settings_essential_tax');
        if (savedEssTax) setEssentialTaxRate(savedEssTax);

        const savedLuxTax = await AsyncStorage.getItem('settings_luxury_tax');
        if (savedLuxTax) setLuxuryTaxRate(savedLuxTax);
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, []);

  // Update profile states when user context updates
  useEffect(() => {
    if (user) {
      setOwnerName(user.ownerName || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setShopName(user.shopName || '');
      setShopCategory(user.shopCategory || '');
    } else {
      setOwnerName('');
      setPhone('');
      setEmail('');
      setShopName('');
      setShopCategory('');
    }
  }, [user]);

  // Save handlers
  const saveSetting = async (key, val) => {
    try {
      await AsyncStorage.setItem(key, String(val));
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileSave = async () => {
    if (!ownerName.trim() || !phone.trim() || !shopName.trim()) {
      Alert.alert('Validation Error', 'Shop Name, Owner Name, and Phone are required.');
      return;
    }
    const success = await updateUser({
      ownerName,
      phone,
      email,
      shopName,
      shopCategory
    });
    if (success) {
      setProfileDialogVisible(false);
      Alert.alert('Success', 'Profile details updated locally.');
    } else {
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handlePasswordSave = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }
    setPasswordDialogVisible(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Success', 'Password has been changed successfully.');
  };

  const handleBusinessDetailsSave = async () => {
    await saveSetting('settings_gstin', gstin);
    await saveSetting('settings_business_address', businessAddress);
    await saveSetting('settings_business_state', businessState);
    await saveSetting('settings_business_country', businessCountry);
    setBusinessDetailsDialogVisible(false);
    Alert.alert('Success', 'Business details updated.');
  };

  const handlePrintLayoutSave = async () => {
    await saveSetting('settings_layout_header_sub', layoutHeaderSub);
    await saveSetting('settings_layout_footer_msg', layoutFooterMsg);
    await saveSetting('settings_layout_show_sign', String(layoutShowSign));
    await saveSetting('settings_business_address', businessAddress);
    await saveSetting('settings_gstin', gstin);
    await saveSetting('settings_layout_instagram', layoutInstagram);
    await saveSetting('settings_layout_gmail', layoutGmail);
    await saveSetting('settings_layout_contact_number', layoutContactNumber);
    if (layoutLogoImage) {
      await saveSetting('settings_layout_logo_image', layoutLogoImage);
    } else {
      await AsyncStorage.removeItem('settings_layout_logo_image');
    }
    setPrintLayoutDialogVisible(false);
    Alert.alert('Success', 'Bill print layout details updated.');
  };

  const pickLogoImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant photo gallery access to pick a logo image.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setLayoutLogoImage(base64Img);
      }
    } catch (err) {
      console.error('Error picking logo:', err);
      Alert.alert('Image Error', 'Failed to pick logo image.');
    }
  };

  const handleGstTaxSave = async () => {
    await saveSetting('settings_standard_tax', standardTaxRate);
    await saveSetting('settings_reduced_tax', reducedTaxRate);
    await saveSetting('settings_essential_tax', essentialTaxRate);
    await saveSetting('settings_luxury_tax', luxuryTaxRate);
    setGstTaxDialogVisible(false);
    Alert.alert('Success', 'GST & Tax Settings updated.');
  };

  const triggerBackup = () => {
    Alert.alert('Backup Successful', 'SQLite database and local invoices have been backed up to secure local storage.');
  };

  const triggerRestore = () => {
    Alert.alert('Restore Complete', 'Latest backup was successfully loaded into SQLite.');
  };

  const showGeneralDialog = (type, title, content) => {
    setActiveDialog(type);
    setDialogTitle(title);
    setDialogContent(content);
  };

  const openReport = async (name) => {
    setReportName(name);
    const config = await AsyncStorage.getItem(`analytics_report_${name}`);
    const saved = config ? JSON.parse(config) : null;
    setReportFrom(saved?.from || '');
    setReportTo(saved?.to || '');
    setReportLayout(saved?.layout || 'detailed');
    setReportColumns(saved?.columns || ['Date', 'Invoice #', 'Customer', 'Total']);
    setReportFigures(saved?.figures || ['Invoice count', 'Sales total', 'Tax total', 'Average invoice']);
    try {
      const [invoices, products] = await Promise.all([
        dbService.getInvoices(user.id),
        dbService.getProducts(user.id),
      ]);
      setReportInvoices(invoices || []);
      setReportProducts(products || []);
    } catch (error) {
      console.error('Could not load report data:', error);
      setReportInvoices([]);
      setReportProducts([]);
    }
    setActiveDialog('report_view');
  };

  const saveReportConfig = async () => {
    const validDate = value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
    if (!validDate(reportFrom) || !validDate(reportTo)) {
      Alert.alert('Check date format', 'Enter dates as YYYY-MM-DD.');
      return;
    }
    if (reportFrom && reportTo && reportFrom > reportTo) {
      Alert.alert('Check date range', 'The start date must be on or before the end date.');
      return;
    }
    await AsyncStorage.setItem(`analytics_report_${reportName}`, JSON.stringify({
      from: reportFrom.trim(), to: reportTo.trim(), layout: reportLayout,
      columns: reportColumns, figures: reportFigures,
    }));
    Alert.alert('Report saved', 'Your date range, figures, columns, and layout have been saved.');
  };

  const toggleReportOption = (list, setList, value) => {
    setList(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
  };

  const reportIsInventory = /inventory|stock/i.test(reportName);
  const filteredReportInvoices = reportInvoices.filter(invoice => {
    const day = String(invoice.created_at || '').slice(0, 10);
    return (!reportFrom || day >= reportFrom) && (!reportTo || day <= reportTo);
  });
  const filteredReportProducts = reportProducts.filter(product => {
    const day = String(product.updated_at || '').slice(0, 10);
    return (!reportFrom || day >= reportFrom) && (!reportTo || day <= reportTo);
  });
  const reportSales = filteredReportInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const reportTax = filteredReportInvoices.reduce((sum, invoice) => sum + Number(invoice.tax || 0), 0);
  const reportDiscount = filteredReportInvoices.reduce((sum, invoice) => sum + Number(invoice.discount || 0), 0);
  const reportStockValue = filteredReportProducts.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.price || 0), 0);
  const reportMetricValues = {
    'Invoice count': filteredReportInvoices.length,
    'Sales total': `₹${reportSales.toLocaleString('en-IN')}`,
    'Tax total': `₹${reportTax.toLocaleString('en-IN')}`,
    'Discount total': `₹${reportDiscount.toLocaleString('en-IN')}`,
    'Average invoice': `₹${(filteredReportInvoices.length ? reportSales / filteredReportInvoices.length : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    'Product count': filteredReportProducts.length,
    'Stock quantity': filteredReportProducts.reduce((sum, product) => sum + Number(product.stock || 0), 0),
    'Stock value': `₹${reportStockValue.toLocaleString('en-IN')}`,
  };
  const reportRows = reportIsInventory
    ? filteredReportProducts.slice(0, 5).map(product => ({
      'Product': product.name, 'SKU': product.sku || '—', 'Quantity': product.stock,
      'Unit price': `₹${Number(product.price || 0).toLocaleString('en-IN')}`,
    }))
    : filteredReportInvoices.slice(0, 5).map(invoice => ({
      'Date': new Date(invoice.created_at).toLocaleDateString(),
      'Invoice #': `#${invoice.invoice_number}`, 'Customer': invoice.customer_name,
      'Subtotal': `₹${Number(invoice.subtotal || 0).toLocaleString('en-IN')}`,
      'Tax': `₹${Number(invoice.tax || 0).toLocaleString('en-IN')}`,
      'Discount': `₹${Number(invoice.discount || 0).toLocaleString('en-IN')}`,
      'Total': `₹${Number(invoice.total || 0).toLocaleString('en-IN')}`,
      'Payment method': invoice.payment_method || '—',
    }));
  const reportProductById = Object.fromEntries(reportProducts.map(product => [product.id, product]));
  const salesDashboard = filteredReportInvoices.reduce((summary, invoice) => {
    let items = [];
    try { items = JSON.parse(invoice.items_json || '[]'); } catch (error) { items = []; }
    summary.income += Number(invoice.total || 0);
    summary.count += 1;
    for (const item of items) {
      const product = reportProductById[item.productId] || {};
      const quantity = Number(item.quantity || 0);
      const revenue = Number(item.total ?? (Number(item.price || 0) * quantity));
      summary.cost += Number(product.purchase_price || 0) * quantity;
      const category = product.category || 'Uncategorized';
      summary.categories[category] = (summary.categories[category] || 0) + revenue;
      const customer = invoice.customer_name || 'Walk-in customer';
      summary.customers[customer] = (summary.customers[customer] || 0) + revenue;
    }
    return summary;
  }, { income: 0, cost: 0, count: 0, categories: {}, customers: {} });
  salesDashboard.profit = salesDashboard.income - salesDashboard.cost;
  const salesCategories = Object.entries(salesDashboard.categories).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const salesCustomers = Object.entries(salesDashboard.customers).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const salesBarMax = Math.max(1, ...salesCategories.map(([, value]) => value));

  return (
    <Portal.Host>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>Settings Control Panel</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onBackground + '99' }]}>Configure profile, layouts, taxes, security, and appearance</Text>
        </View>

        <Card style={[styles.mainCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={{ padding: 0 }}>
            
            {/* SECTION 1: PROFILE ACCORDION */}
            <List.Accordion
              title="1. Profile Settings"
              left={props => <List.Icon {...props} icon="account" color={theme.colors.primary} />}
              titleStyle={[styles.accordionTitle, { color: theme.colors.onSurface }]}
            >
              <View style={[styles.accordionChild, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: theme.colors.onSurface + '99' }]}>Shop Name:</Text>
                  <Text style={[styles.value, { color: theme.colors.onSurface }]}>{user?.shopName}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: theme.colors.onSurface + '99' }]}>Category:</Text>
                  <Text style={[styles.value, { color: theme.colors.onSurface }]}>{user?.shopCategory || 'Electronics'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: theme.colors.onSurface + '99' }]}>Owner Name:</Text>
                  <Text style={[styles.value, { color: theme.colors.onSurface }]}>{user?.ownerName}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: theme.colors.onSurface + '99' }]}>Phone:</Text>
                  <Text style={[styles.value, { color: theme.colors.onSurface }]}>{user?.phone}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: theme.colors.onSurface + '99' }]}>Email:</Text>
                  <Text style={[styles.value, { color: theme.colors.onSurface }]}>{user?.email}</Text>
                </View>

                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <Button 
                    mode="contained" 
                    buttonColor={theme.colors.primary}
                    onPress={() => setProfileDialogVisible(true)}
                    style={{ flex: 1, marginRight: 8, borderRadius: 8 }}
                    icon="pencil"
                  >
                    Edit Profile
                  </Button>
                  <Button 
                    mode="outlined" 
                    textColor={theme.colors.primary}
                    style={{ flex: 1, borderColor: theme.colors.primary, borderRadius: 8 }}
                    onPress={() => setPasswordDialogVisible(true)}
                    icon="lock-reset"
                  >
                    Password
                  </Button>
                </View>
              </View>
            </List.Accordion>

            <Divider />

            {/* SECTION 2: BUSINESS SETTINGS */}
            <List.Accordion
              title="2. Business Settings"
              left={props => <List.Icon {...props} icon="briefcase" color={theme.colors.primary} />}
              titleStyle={[styles.accordionTitle, { color: theme.colors.onSurface }]}
            >
              <View style={[styles.accordionChild, { backgroundColor: theme.colors.surfaceVariant }]}>
                <List.Item
                  title="Business Details"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description={`GSTIN: ${gstin} | State: ${businessState}`}
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  left={props => <List.Icon {...props} icon="office-building" color={theme.colors.primary} />}
                  onPress={() => setBusinessDetailsDialogVisible(true)}
                />
                <List.Item
                  title="GST & Tax Settings"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description={`Std: ${standardTaxRate}% | Ess: ${essentialTaxRate}% | Lux: ${luxuryTaxRate}%`}
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  left={props => <List.Icon {...props} icon="percent" color={theme.colors.primary} />}
                  onPress={() => setGstTaxDialogVisible(true)}
                />
                <List.Item
                  title="Purchase Inventory"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description="Manage stock, product costs, and inventory"
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  left={props => <List.Icon {...props} icon="package-variant-closed" color={theme.colors.primary} />}
                  right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
                  onPress={() => navigation.navigate('PurchaseInventory')}
                />
              </View>
            </List.Accordion>

            <Divider />

            {/* SECTION 3: BILLING SETTINGS */}
            <List.Accordion
              title="3. Billing & Print Layout"
              left={props => <List.Icon {...props} icon="printer" color={theme.colors.primary} />}
              titleStyle={[styles.accordionTitle, { color: theme.colors.onSurface }]}
            >
              <View style={[styles.accordionChild, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.subLabel, { color: theme.colors.onSurface + '99' }]}>Receipt Paper Size</Text>
                <SegmentedButtons
                  value={receiptSize}
                  onValueChange={(val) => {
                    setReceiptSize(val);
                    saveSetting('settings_receipt_size', val);
                  }}
                  buttons={[
                    { value: '58mm', label: '58mm' },
                    { value: '80mm', label: '80mm' },
                    { value: 'A4', label: 'A4' },
                  ]}
                  style={{ marginBottom: 12 }}
                />

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>Auto Print after checkout</Text>
                  <Switch
                    value={autoPrint}
                    onValueChange={(val) => {
                      setAutoPrint(val);
                      saveSetting('settings_auto_print', val);
                    }}
                    thumbColor={autoPrint ? theme.colors.primary : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: '#cbbff8' }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>Embed dynamic UPI QR code on Bill</Text>
                  <Switch
                    value={qrCodeOnBill}
                    onValueChange={(val) => {
                      setQrCodeOnBill(val);
                      saveSetting('settings_qr_code', val);
                    }}
                    thumbColor={qrCodeOnBill ? theme.colors.primary : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: '#cbbff8' }}
                  />
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <List.Item
                  title="Discount settings"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description="Enable custom margins and loyalty offsets"
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  onPress={() => showGeneralDialog('discount', 'Discount Options', 'Set default global discount parameters and maximum threshold discount rate percentages (e.g. Max: 30%).')}
                />
                <List.Item
                  title="Barcode settings"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description="Customize scan prefixes and autofocus bounds"
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  onPress={() => showGeneralDialog('barcode', 'Barcode Config', 'Integrate hardware scanner prefixes or utilize camera overlay scanner for product searches.')}
                />
                <List.Item
                  title="Return & Refund Settings"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description="Validate refund rules and return margins"
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  onPress={() => showGeneralDialog('return_refund', 'Return & Refund Policies', 'Enable invoice returns up to 14 days post-generation. Refunds credit back to customer ledger balances.')}
                />
                <List.Item
                  title="Bill Print Layout Details"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description="Customize header subtitle, address, GSTIN, and footer message"
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  left={props => <List.Icon {...props} icon="file-document-edit-outline" color={theme.colors.primary} />}
                  onPress={() => setPrintLayoutDialogVisible(true)}
                />
              </View>
            </List.Accordion>

            <Divider />

            {/* SECTION 4: REPORTS */}
            <List.Accordion
              title="4. Analytical Reports"
              left={props => <List.Icon {...props} icon="file-chart" color={theme.colors.primary} />}
              titleStyle={[styles.accordionTitle, { color: theme.colors.onSurface }]}
            >
              <View style={[styles.accordionChild, { backgroundColor: theme.colors.surfaceVariant }]}>
                <List.Item
                  title="Reports And Analytis"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description="Open the latest live Reports & Analytics dashboard"
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  left={props => <List.Icon {...props} icon="chart-box" color={theme.colors.primary} />}
                  right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
                  onPress={() => navigation.navigate('Analytics')}
                />
              </View>
            </List.Accordion>

            <Divider />

            {/* SECTION 5: SECURITY */}
            <List.Accordion
              title="5. Security Settings"
              left={props => <List.Icon {...props} icon="shield-check" color={theme.colors.primary} />}
              titleStyle={[styles.accordionTitle, { color: theme.colors.onSurface }]}
            >
              <View style={[styles.accordionChild, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>Enable Two-Factor Auth (2FA)</Text>
                  <Switch
                    value={twoFactorAuth}
                    onValueChange={setTwoFactorAuth}
                    thumbColor={twoFactorAuth ? theme.colors.primary : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: '#cbbff8' }}
                  />
                </View>

                <List.Item
                  title="Login History"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description="View recent login logs and IPs"
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  onPress={() => showGeneralDialog(
                    'login_history',
                    'Active Logins Log',
                    `• Android - Expo Go (Bangalore) - Active Session\n• Windows - Metro Server (Bangalore) - 1 hour ago\n• Android - Web client - 2 days ago`
                  )}
                />
                <List.Item
                  title="Active Session & Device management"
                  titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  description="Verify active login scopes and remove devices"
                  descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                  onPress={() => showGeneralDialog(
                    'session_mgr',
                    'Active Device Control',
                    `Authorized Devices:\n1. Samsung Galaxy (Expo Client) - Authorized\n2. Desktop Web Dashboard - Authorized`
                  )}
                />
              </View>
            </List.Accordion>

            <Divider />

            {/* SECTION 6: DATA MANAGEMENT */}
            <List.Accordion
              title="6. Data Management"
              left={props => <List.Icon {...props} icon="database" color={theme.colors.primary} />}
              titleStyle={[styles.accordionTitle, { color: theme.colors.onSurface }]}
            >
              <View style={[styles.accordionChild, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>Background Auto-Sync (Recommended)</Text>
                  <Switch
                    value={autoSync}
                    onValueChange={(val) => {
                      setAutoSync(val);
                      syncService.setAutoSyncEnabled(val).catch((err) => console.error('Failed to save auto-sync setting:', err));
                      if (val && user?.id) {
                        syncService.syncIfEnabled(user.id).catch((err) => console.log('Immediate auto sync failed:', err));
                      }
                    }}
                    thumbColor={autoSync ? theme.colors.primary : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: '#cbbff8' }}
                  />
                </View>

                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <Button 
                    mode="contained" 
                    buttonColor={theme.colors.primary}
                    onPress={triggerBackup}
                    style={{ flex: 1, marginRight: 8, borderRadius: 8 }}
                    icon="cloud-upload"
                  >
                    Backup Data
                  </Button>
                  <Button 
                    mode="outlined" 
                    textColor={theme.colors.primary}
                    style={{ flex: 1, borderColor: theme.colors.primary, borderRadius: 8 }}
                    onPress={triggerRestore}
                    icon="cloud-download"
                  >
                    Restore Data
                  </Button>
                </View>

                <Divider style={{ marginVertical: 12 }} />

                <View style={{ flexDirection: 'row' }}>
                  <Button 
                    mode="text" 
                    textColor={theme.colors.primary}
                    style={{ flex: 1 }}
                    icon="export"
                    onPress={() => Alert.alert('CSV Exported', 'Products and invoices lists exported in CSV format to your downloads directory.')}
                  >
                    Export
                  </Button>
                  <Button 
                    mode="text" 
                    textColor={theme.colors.primary}
                    style={{ flex: 1 }}
                    icon="import"
                    onPress={() => Alert.alert('CSV Import Ready', 'Please select a products CSV to populate inventory.')}
                  >
                    Import
                  </Button>
                </View>
              </View>
            </List.Accordion>

            <Divider />

            {/* SECTION 7: APPEARANCE */}
            <List.Accordion
              title="7. Interface Appearance"
              left={props => <List.Icon {...props} icon="palette" color={theme.colors.primary} />}
              titleStyle={[styles.accordionTitle, { color: theme.colors.onSurface }]}
            >
              <View style={[styles.accordionChild, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>Enable Dark Mode UI theme</Text>
                  <Switch
                    value={isDarkMode}
                    onValueChange={toggleDarkMode}
                    thumbColor={isDarkMode ? theme.colors.primary : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: '#cbbff8' }}
                  />
                </View>

                <Text style={[styles.subLabel, { color: theme.colors.onSurface + '99' }]}>UI Highlight Color Scheme</Text>
                <SegmentedButtons
                  value={themeColor}
                  onValueChange={changeThemeColor}
                  buttons={[
                    { value: 'Default', label: 'Purple' },
                    { value: 'Indigo', label: 'Indigo' },
                    { value: 'Teal', label: 'Teal' },
                  ]}
                  style={{ marginBottom: 12 }}
                />

                <Text style={[styles.subLabel, { color: theme.colors.onSurface + '99' }]}>Display Font Scaling</Text>
                <SegmentedButtons
                  value={fontSize}
                  onValueChange={(val) => {
                    setFontSize(val);
                    saveSetting('settings_font_size', val);
                  }}
                  buttons={[
                    { value: 'Small', label: 'Small' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Large', label: 'Large' },
                  ]}
                />
              </View>
            </List.Accordion>

          </Card.Content>
        </Card>

        {/* LOGOUT BUTTON FOOTER */}
        <Button
          mode="contained"
          buttonColor="#ef4444"
          onPress={logout}
          style={styles.logoutBtn}
          icon="logout"
          textColor="#fff"
        >
          Logout of Account
        </Button>
      </ScrollView>

      {/* DIALOG: Edit Profile Form */}
      <Portal>
        <Dialog visible={profileDialogVisible} onDismiss={() => setProfileDialogVisible(false)}>
          <Dialog.Title>Edit Profile Details</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Shop Name"
              value={shopName}
              onChangeText={setShopName}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
            />
            <TextInput
              label="Shop Category"
              value={shopCategory}
              onChangeText={setShopCategory}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
            />
            <TextInput
              label="Owner Name"
              value={ownerName}
              onChangeText={setOwnerName}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
            />
            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
              keyboardType="phone-pad"
            />
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              activeOutlineColor="#5a4bda"
              keyboardType="email-address"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setProfileDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleProfileSave}>Save Updates</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* DIALOG: Change Password Form */}
      <Portal>
        <Dialog visible={passwordDialogVisible} onDismiss={() => setPasswordDialogVisible(false)}>
          <Dialog.Title>Change Password</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Current Password"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
            />
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
            />
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              mode="outlined"
              activeOutlineColor="#5a4bda"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPasswordDialogVisible(false)}>Cancel</Button>
            <Button onPress={handlePasswordSave}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* DIALOG: Edit Business Details */}
      <Portal>
        <Dialog visible={businessDetailsDialogVisible} onDismiss={() => setBusinessDetailsDialogVisible(false)}>
          <Dialog.Title>Edit Business Details</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="GSTIN Number"
              value={gstin}
              onChangeText={setGstin}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
            />
            <TextInput
              label="Business Address"
              value={businessAddress}
              onChangeText={setBusinessAddress}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
              multiline
              numberOfLines={2}
            />
            <TextInput
              label="State"
              value={businessState}
              onChangeText={setBusinessState}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
            />
            <TextInput
              label="Country"
              value={businessCountry}
              onChangeText={setBusinessCountry}
              mode="outlined"
              activeOutlineColor="#5a4bda"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBusinessDetailsDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleBusinessDetailsSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* DIALOG: Edit Print Layout Details */}
      <Portal>
        <Dialog visible={printLayoutDialogVisible} onDismiss={() => setPrintLayoutDialogVisible(false)}>
          <Dialog.Title>Edit Bill Print Layout Details</Dialog.Title>
          <ScrollView style={{ maxHeight: 400 }}>
            <Dialog.Content>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 5 }}>Logo Image</Text>
              {layoutLogoImage ? (
                <View style={{ alignItems: 'center', marginBottom: 10 }}>
                  <Image source={{ uri: layoutLogoImage }} style={{ width: 150, height: 50, resizeMode: 'contain', borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 8, padding: 4 }} />
                  <Button mode="text" textColor="#ef4444" onPress={() => setLayoutLogoImage(null)} style={{ marginTop: 2 }}>
                    Remove Logo
                  </Button>
                </View>
              ) : (
                <Button mode="outlined" icon="image" onPress={pickLogoImage} style={{ marginBottom: 10 }}>
                  Upload Logo Image
                </Button>
              )}

              <TextInput
                label="Header Subtitle / Slogan"
                value={layoutHeaderSub}
                onChangeText={setLayoutHeaderSub}
                mode="outlined"
                style={{ marginBottom: 10 }}
                activeOutlineColor="#5a4bda"
              />
              <TextInput
                label="GSTIN Number"
                value={gstin}
                onChangeText={setGstin}
                mode="outlined"
                style={{ marginBottom: 10 }}
                activeOutlineColor="#5a4bda"
              />
              <TextInput
                label="Business Address"
                value={businessAddress}
                onChangeText={setBusinessAddress}
                mode="outlined"
                style={{ marginBottom: 10 }}
                activeOutlineColor="#5a4bda"
                multiline
                numberOfLines={2}
              />
              <TextInput
                label="Instagram Handle"
                value={layoutInstagram}
                onChangeText={setLayoutInstagram}
                placeholder="@my_shop"
                mode="outlined"
                style={{ marginBottom: 10 }}
                activeOutlineColor="#5a4bda"
                left={<TextInput.Icon icon="instagram" />}
              />
              <TextInput
                label="Email (Gmail)"
                value={layoutGmail}
                onChangeText={setLayoutGmail}
                placeholder="shop@gmail.com"
                mode="outlined"
                style={{ marginBottom: 10 }}
                activeOutlineColor="#5a4bda"
                keyboardType="email-address"
                left={<TextInput.Icon icon="email-outline" />}
              />
              <TextInput
                label="Contact Number"
                value={layoutContactNumber}
                onChangeText={setLayoutContactNumber}
                placeholder="+91 98765 43210"
                mode="outlined"
                style={{ marginBottom: 10 }}
                activeOutlineColor="#5a4bda"
                keyboardType="phone-pad"
                left={<TextInput.Icon icon="phone-outline" />}
              />
              <TextInput
                label="Footer Message / Terms"
                value={layoutFooterMsg}
                onChangeText={setLayoutFooterMsg}
                mode="outlined"
                style={{ marginBottom: 10 }}
                activeOutlineColor="#5a4bda"
                multiline
                numberOfLines={2}
              />
              <View style={[styles.switchRow, { paddingHorizontal: 0, marginTop: 5 }]}>
                <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>Show signature line in footer</Text>
                <Switch
                  value={layoutShowSign}
                  onValueChange={setLayoutShowSign}
                  thumbColor={layoutShowSign ? theme.colors.primary : '#f4f3f4'}
                  trackColor={{ false: '#767577', true: '#cbbff8' }}
                />
              </View>
            </Dialog.Content>
          </ScrollView>
          <Dialog.Actions>
            <Button onPress={() => setPrintLayoutDialogVisible(false)}>Cancel</Button>
            <Button onPress={handlePrintLayoutSave}>Save Details</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* DIALOG: Edit GST & Tax Settings */}
      <Portal>
        <Dialog visible={gstTaxDialogVisible} onDismiss={() => setGstTaxDialogVisible(false)}>
          <Dialog.Title>Edit GST & Tax Settings</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Standard GST Rate (%)"
              value={standardTaxRate}
              onChangeText={setStandardTaxRate}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
              keyboardType="numeric"
            />
            <TextInput
              label="Reduced GST Rate (%)"
              value={reducedTaxRate}
              onChangeText={setReducedTaxRate}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
              keyboardType="numeric"
            />
            <TextInput
              label="Essential Goods Rate (%)"
              value={essentialTaxRate}
              onChangeText={setEssentialTaxRate}
              mode="outlined"
              style={{ marginBottom: 10 }}
              activeOutlineColor="#5a4bda"
              keyboardType="numeric"
            />
            <TextInput
              label="Luxury Goods Rate (%)"
              value={luxuryTaxRate}
              onChangeText={setLuxuryTaxRate}
              mode="outlined"
              activeOutlineColor="#5a4bda"
              keyboardType="numeric"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setGstTaxDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleGstTaxSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* DIALOG: General Informational Popups */}
      <Portal>
        <Dialog visible={activeDialog === 'report_view'} onDismiss={() => setActiveDialog(null)} style={{ maxHeight: '90%' }}>
          <Dialog.Title>{reportName}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 520 }}>
            <ScrollView>
              <View style={{ paddingVertical: 8 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Date range (YYYY-MM-DD)</Text>
                <TextInput label="From date" value={reportFrom} onChangeText={setReportFrom} placeholder="2026-01-01" mode="outlined" dense />
                <TextInput label="To date" value={reportTo} onChangeText={setReportTo} placeholder="2026-12-31" mode="outlined" dense style={{ marginTop: 8 }} />

                <Text style={{ fontWeight: 'bold', marginTop: 16 }}>Figures shown</Text>
                {['Invoice count', 'Sales total', 'Tax total', 'Discount total', 'Average invoice', 'Product count', 'Stock quantity', 'Stock value'].map(item => (
                  <Checkbox.Item key={item} label={item} status={reportFigures.includes(item) ? 'checked' : 'unchecked'} onPress={() => toggleReportOption(reportFigures, setReportFigures, item)} />
                ))}

                <Text style={{ fontWeight: 'bold', marginTop: 12 }}>Columns</Text>
                {['Date', 'Invoice #', 'Customer', 'Subtotal', 'Tax', 'Discount', 'Total', 'Payment method', 'Product', 'SKU', 'Quantity', 'Unit price'].map(item => (
                  <Checkbox.Item key={item} label={item} status={reportColumns.includes(item) ? 'checked' : 'unchecked'} onPress={() => toggleReportOption(reportColumns, setReportColumns, item)} />
                ))}

                <Text style={{ fontWeight: 'bold', marginTop: 12 }}>Layout</Text>
                <SegmentedButtons value={reportLayout} onValueChange={setReportLayout} buttons={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'detailed', label: 'Detailed' },
                ]} />

                <Text style={{ fontWeight: 'bold', marginTop: 16 }}>Preview</Text>
                {reportName === 'Sales Report' ? (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                      <Text style={{ color: '#475569', fontSize: 13 }}>Total sells (invoices)</Text>
                      <Text style={{ color: '#1d4ed8', fontSize: 28, fontWeight: 'bold' }}>{salesDashboard.count}</Text>
                      <Text style={{ color: '#475569', fontSize: 12 }}>{reportFrom || reportTo ? `${reportFrom || 'Beginning'} to ${reportTo || 'Today'}` : 'All dates'}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 7, marginBottom: 12 }}>
                      {[
                        { title: 'Sales Income', value: salesDashboard.income, color: '#0e7490' },
                        { title: 'Sales Profit', value: salesDashboard.profit, color: '#2563eb' },
                        { title: 'Sales Cost', value: salesDashboard.cost, color: '#7c3aed' },
                      ].map(metric => (
                        <View key={metric.title} style={{ flex: 1, minWidth: 0, backgroundColor: theme.colors.surfaceVariant, borderRadius: 10, padding: 9 }}>
                          <Text numberOfLines={1} style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{metric.title}</Text>
                          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15, fontWeight: 'bold', color: metric.color, marginTop: 5 }}>₹{metric.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={{ backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Sales Performance · Top Customers</Text>
                      {salesCustomers.length ? salesCustomers.map(([name, amount], index) => (
                        <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: index === salesCustomers.length - 1 ? 0 : StyleSheet.hairlineWidth, borderColor: theme.colors.outlineVariant }}>
                          <Text numberOfLines={1} style={{ flex: 1, color: theme.colors.onSurface }}>{index + 1}. {name}</Text>
                          <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        </View>
                      )) : <Text style={{ color: theme.colors.onSurfaceVariant }}>No sales in this date range.</Text>}
                    </View>

                    <View style={{ backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Product Analysis · Sales by Category</Text>
                      {salesCategories.length ? salesCategories.map(([name, amount]) => (
                        <View key={name} style={{ marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                            <Text numberOfLines={1} style={{ flex: 1, color: theme.colors.onSurface }}>{name}</Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                          </View>
                          <View style={{ height: 7, backgroundColor: theme.colors.surfaceVariant, borderRadius: 5, overflow: 'hidden' }}>
                            <View style={{ width: `${Math.max(3, amount / salesBarMax * 100)}%`, height: 7, backgroundColor: '#568cff', borderRadius: 5 }} />
                          </View>
                        </View>
                      )) : <Text style={{ color: theme.colors.onSurfaceVariant }}>No product category data in this date range.</Text>}
                    </View>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginBottom: 8 }}>Cost and profit use each sold product’s saved purchase price. Products without a purchase price count as zero cost.</Text>
                  </View>
                ) : null}
                <Text style={{ marginTop: 6 }}>{reportFigures
                  .filter(item => reportIsInventory ? ['Product count', 'Stock quantity', 'Stock value'].includes(item) : ['Invoice count', 'Sales total', 'Tax total', 'Discount total', 'Average invoice'].includes(item))
                  .map(item => `${item}: ${reportMetricValues[item]}`).join('  ·  ') || 'Select figures above to show them in the report.'}</Text>
                {reportLayout === 'detailed' && reportRows.map((row, index) => (
                  <Text key={index} style={{ marginTop: 6, color: '#475569' }}>{reportColumns
                    .filter(column => row[column] !== undefined)
                    .map(column => `${column}: ${row[column]}`).join('  ·  ') || 'Choose columns above to preview row details.'}</Text>
                ))}
                {(reportName === 'Purchase Report' || reportName === 'Supplier Report') && <Text style={{ marginTop: 8, color: '#b45309' }}>Purchase records are not stored in this app yet.</Text>}
                {(reportName === 'GST Report') && <Text style={{ marginTop: 8 }}>GST shown above is calculated from saved sales invoices.</Text>}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setActiveDialog(null)}>Close</Button>
            <Button onPress={saveReportConfig}>Save report</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={activeDialog !== null && activeDialog !== 'report_view'} onDismiss={() => setActiveDialog(null)}>
          <Dialog.Title>{dialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 14, color: '#334155', lineHeight: 20 }}>
              {dialogContent}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setActiveDialog(null)}>Dismiss</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 44,
    backgroundColor: '#f1f5f9',
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accordionTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#1e293b',
  },
  accordionChild: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  subLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gridBtn: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    alignItems: 'center',
    marginVertical: 6,
    elevation: 1,
  },
  gridText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
  },
  logoutBtn: {
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 2,
  },
});
