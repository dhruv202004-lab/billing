import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, Image, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { Text, TextInput, Button, Divider, FAB, Portal, Dialog, IconButton, List, SegmentedButtons, Card, useTheme } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { syncService } from '../services/syncService';

export default function InventoryScreen() {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const isFocused = useIsFocused();

  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [productFormVisible, setProductFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form States
  const [name, setName] = useState('');
  const [price, setPrice] = useState(''); // Selling price
  const [stock, setStock] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(''); // Product category
  const [image, setImage] = useState('');
  const [barcode, setBarcode] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [supplier, setSupplier] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [tax, setTax] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [unit, setUnit] = useState('Pcs');
  const [minimumStock, setMinimumStock] = useState('0');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');

  // Dynamic Key-Value Pairs
  const [otherDetailsList, setOtherDetailsList] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Barcode Scanner states
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);

  const loadProducts = async () => {
    if (!user) return;
    try {
      const p = await dbService.getProducts(user.id);
      setProducts(p);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  useEffect(() => {
    if (isFocused && user) {
      loadProducts();
      syncService.syncIfEnabled(user.id)
        .then(() => loadProducts())
        .catch(err => console.log('Auto background sync failed:', err));
    }
  }, [isFocused, user]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant photo gallery access to pick images.');
        return;
      }
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.25,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImage(base64Img);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Image Error', 'Failed to pick image.');
    }
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

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setBarcode(data);
    setScannerVisible(false);
    setScanned(false);
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setStock('');
    setSku('');
    setCategory('');
    setImage('');
    setBarcode('');
    setBusinessCategory('');
    setBrand('');
    setSupplier('');
    setPurchasePrice('');
    setTax('0');
    setDiscount('0');
    setUnit('Pcs');
    setMinimumStock('0');
    setDescription('');
    setStatus('Active');
    setOtherDetailsList([]);
    setProductFormVisible(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setSku(product.sku || '');
    setCategory(product.category || '');
    setImage(product.image || '');
    setBarcode(product.barcode || '');
    setBusinessCategory(product.business_category || '');
    setBrand(product.brand || '');
    setSupplier(product.supplier || '');
    setPurchasePrice(product.purchase_price ? product.purchase_price.toString() : '');
    setTax(product.tax ? product.tax.toString() : '0');
    setDiscount(product.discount ? product.discount.toString() : '0');
    setUnit(product.unit || 'Pcs');
    setMinimumStock(product.minimum_stock ? product.minimum_stock.toString() : '0');
    setDescription(product.description || '');
    setStatus(product.status || 'Active');

    // Parse SQLite JSON other_details back into list
    let otherList = [];
    if (product.other_details) {
      try {
        const parsed = typeof product.other_details === 'string' ? JSON.parse(product.other_details) : product.other_details;
        otherList = Object.keys(parsed).map(key => ({ key, value: parsed[key] }));
      } catch (err) {
        console.error('Error parsing other_details:', err);
      }
    }
    setOtherDetailsList(otherList);
    setProductFormVisible(true);
  };

  const addCustomDetail = () => {
    if (!newKey.trim()) {
      Alert.alert('Error', 'Detail key/label cannot be empty');
      return;
    }
    if (otherDetailsList.some(item => item.key.toLowerCase() === newKey.trim().toLowerCase())) {
      Alert.alert('Duplicate', `The detail "${newKey.trim()}" already exists`);
      return;
    }
    setOtherDetailsList([...otherDetailsList, { key: newKey.trim(), value: newValue.trim() }]);
    setNewKey('');
    setNewValue('');
  };

  const removeCustomDetail = (key) => {
    setOtherDetailsList(otherDetailsList.filter(item => item.key !== key));
  };

  const handleSaveProduct = async () => {
    if (!name || !price || !stock) {
      Alert.alert('Missing fields', 'Name, Price and Stock are required');
      return;
    }

    const otherDetailsObj = {};
    otherDetailsList.forEach(item => {
      if (item.key.trim()) {
        otherDetailsObj[item.key.trim()] = item.value;
      }
    });

    const productData = {
      name,
      price: Number(price),
      stock: Number(stock),
      sku,
      category,
      image,
      barcode,
      businessCategory,
      brand,
      supplier,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      tax: Number(tax),
      discount: Number(discount),
      unit,
      minimumStock: Number(minimumStock),
      description,
      status,
      otherDetails: otherDetailsObj
    };

    try {
      if (editingProduct) {
        const updated = await dbService.updateProduct(user.id, editingProduct.id, productData);
        setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
      } else {
        const created = await dbService.addProduct(user.id, productData);
        setProducts([...products, created]);
      }
      syncService.syncIfEnabled(user.id).catch((err) => console.log('Product auto sync failed:', err));
      setProductFormVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Save Error', 'Failed to save product details.');
    }
  };

  const handleDeleteProduct = async (productId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product from inventory?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.deleteProduct(productId);
              setProducts(products.filter(p => p.id !== productId));
              syncService.syncIfEnabled(user.id).catch((err) => console.log('Product delete auto sync failed:', err));
            } catch (err) {
              console.error(err);
              Alert.alert('Delete Error', 'Failed to delete product.');
            }
          }
        }
      ]
    );
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Portal.Host>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>Inventory Management</Text>
        </View>

        <TextInput
          placeholder="Search by name, brand, SKU..."
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

        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.onBackground + '80' }]}>No inventory products found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                description={`SKU: ${item.sku || 'N/A'} | Price: ₹${Number(item.price).toFixed(2)} | Stock: ${item.stock} ${item.unit || 'Pcs'}`}
                descriptionStyle={{ color: theme.colors.onSurface + 'b3' }}
                left={() => (
                  item.image ? (
                    <Image source={{ uri: item.image }} style={styles.listProductImage} />
                  ) : (
                    <List.Icon icon="package-variant-closed" color={theme.colors.primary} style={styles.listIcon} />
                  )
                )}
                right={() => (
                  <View style={styles.actionIcons}>
                    <IconButton icon="pencil" size={20} onPress={() => openEditForm(item)} iconColor={theme.colors.primary} />
                    <IconButton icon="delete" size={20} onPress={() => handleDeleteProduct(item.id)} iconColor="#d32f2f" />
                  </View>
                )}
                style={styles.listItem}
              />
            )}
          />
        )}

        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={openAddForm}
          color="#fff"
        />

        <Portal>
          {/* Barcode Scanner Modal */}
          <Dialog visible={scannerVisible} onDismiss={() => setScannerVisible(false)} style={styles.scannerDialog}>
            <Dialog.Title style={{ color: '#0f172a', fontWeight: 'bold' }}>Scan Barcode</Dialog.Title>
            <Dialog.Content style={styles.scannerContent}>
              <CameraView
                style={styles.camera}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code128', 'qr'],
                }}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setScannerVisible(false)}>Cancel</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Full Screen Form Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={productFormVisible}
          onRequestClose={() => setProductFormVisible(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <IconButton
                icon="close"
                size={24}
                iconColor="#4f566b"
                onPress={() => setProductFormVisible(false)}
              />
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </Text>
              <Button
                mode="contained"
                onPress={handleSaveProduct}
                buttonColor="#5a4bda"
                textColor="#fff"
                style={styles.headerSaveBtn}
              >
                Save
              </Button>
            </View>

            {/* Modal Form Content */}
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScrollView}>
              
              {/* CARD 1: BASIC INFORMATION */}
              <Card style={styles.formSectionCard}>
                <Card.Title title="Basic Information" titleStyle={styles.cardHeaderTitle} left={(props) => <List.Icon {...props} icon="package-variant" color="#5a4bda" />} />
                <Card.Content>
                  
                  {/* Image Selector row */}
                  <View style={styles.imageSelectorRow}>
                    <TouchableOpacity onPress={pickImage} style={styles.imageBox}>
                      {image ? (
                        <Image source={{ uri: image }} style={styles.formImage} />
                      ) : (
                        <List.Icon icon="camera-plus-outline" color="#777" size={32} />
                      )}
                    </TouchableOpacity>
                    <View style={styles.imageSelectInfo}>
                      <Text style={styles.imageSelectTitle}>Product Image</Text>
                      <Button mode="text" compact onPress={pickImage} textColor="#5a4bda">
                        {image ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                    </View>
                  </View>

                  <TextInput
                    label="Product Name *"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />
                  
                  <TextInput
                    label="Product Code (SKU)"
                    value={sku}
                    onChangeText={setSku}
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />
                  
                  <View style={styles.barcodeRow}>
                    <TextInput
                      label="Barcode"
                      value={barcode}
                      onChangeText={setBarcode}
                      mode="outlined"
                      style={[styles.dialogInput, { flex: 1, marginBottom: 0 }]}
                      activeOutlineColor="#5a4bda"
                    />
                    <IconButton
                      icon="barcode-scan"
                      mode="contained"
                      containerColor="#f5f5fa"
                      iconColor="#5a4bda"
                      size={24}
                      onPress={openBarcodeScanner}
                      style={styles.scanBtn}
                    />
                  </View>

                </Card.Content>
              </Card>

              {/* CARD 2: PRICING & TAXATION */}
              <Card style={styles.formSectionCard}>
                <Card.Title title="Pricing & Taxation" titleStyle={styles.cardHeaderTitle} left={(props) => <List.Icon {...props} icon="currency-usd" color="#5a4bda" />} />
                <Card.Content>
                  
                  <TextInput
                    label="Purchase Price (₹)"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />
                  
                  <TextInput
                    label="Selling Price (₹) *"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />
                  
                  <View style={styles.formRow}>
                    <TextInput
                      label="Tax / GST (%)"
                      value={tax}
                      onChangeText={setTax}
                      keyboardType="numeric"
                      mode="outlined"
                      style={[styles.dialogInput, { flex: 0.48 }]}
                      activeOutlineColor="#5a4bda"
                    />
                    <TextInput
                      label="Discount (%)"
                      value={discount}
                      onChangeText={setDiscount}
                      keyboardType="numeric"
                      mode="outlined"
                      style={[styles.dialogInput, { flex: 0.48 }]}
                      activeOutlineColor="#5a4bda"
                    />
                  </View>

                  <TextInput
                    label="Unit (e.g. Pcs, Kg, Ltr)"
                    value={unit}
                    onChangeText={setUnit}
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />

                </Card.Content>
              </Card>

              {/* CARD 3: STOCK & INVENTORY */}
              <Card style={styles.formSectionCard}>
                <Card.Title title="Stock & Inventory" titleStyle={styles.cardHeaderTitle} left={(props) => <List.Icon {...props} icon="storefront-outline" color="#5a4bda" />} />
                <Card.Content>
                  
                  <View style={styles.formRow}>
                    <TextInput
                      label="Stock Quantity *"
                      value={stock}
                      onChangeText={setStock}
                      keyboardType="numeric"
                      mode="outlined"
                      style={[styles.dialogInput, { flex: 0.48 }]}
                      activeOutlineColor="#5a4bda"
                    />
                    <TextInput
                      label="Min Stock Alert"
                      value={minimumStock}
                      onChangeText={setMinimumStock}
                      keyboardType="numeric"
                      mode="outlined"
                      style={[styles.dialogInput, { flex: 0.48 }]}
                      activeOutlineColor="#5a4bda"
                    />
                  </View>

                  <Text style={styles.sectionSublabel}>Product Status</Text>
                  <SegmentedButtons
                    value={status}
                    onValueChange={setStatus}
                    buttons={[
                      { value: 'Active', label: 'Active', checkedColor: '#fff', style: { backgroundColor: status === 'Active' ? '#5a4bda' : '#fff' } },
                      { value: 'Inactive', label: 'Inactive', checkedColor: '#fff', style: { backgroundColor: status === 'Inactive' ? '#d32f2f' : '#fff' } },
                    ]}
                    style={styles.segmentBtns}
                  />

                </Card.Content>
              </Card>

              {/* CARD 4: CATEGORIZATION & BRANDING */}
              <Card style={styles.formSectionCard}>
                <Card.Title title="Categorization & Branding" titleStyle={styles.cardHeaderTitle} left={(props) => <List.Icon {...props} icon="shape-outline" color="#5a4bda" />} />
                <Card.Content>
                  
                  <TextInput
                    label="Product Category"
                    value={category}
                    onChangeText={setCategory}
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />
                  <TextInput
                    label="Business Category"
                    value={businessCategory}
                    onChangeText={setBusinessCategory}
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />
                  <TextInput
                    label="Brand / Manufacturer"
                    value={brand}
                    onChangeText={setBrand}
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />
                  <TextInput
                    label="Supplier Details"
                    value={supplier}
                    onChangeText={setSupplier}
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />

                </Card.Content>
              </Card>

              {/* CARD 5: DESCRIPTION & CUSTOM DETAILS */}
              <Card style={styles.formSectionCard}>
                <Card.Title title="Description & Custom Details" titleStyle={styles.cardHeaderTitle} left={(props) => <List.Icon {...props} icon="plus-box-outline" color="#5a4bda" />} />
                <Card.Content>
                  
                  <TextInput
                    label="Description"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    mode="outlined"
                    style={styles.dialogInput}
                    activeOutlineColor="#5a4bda"
                  />

                  <Divider style={{ marginVertical: 12 }} />
                  <Text style={styles.sectionSublabel}>Add dynamic attributes (e.g. Size, Color)</Text>
                  
                  <View style={styles.customFieldInputRow}>
                    <TextInput
                      placeholder="Label (e.g. Color)"
                      value={newKey}
                      onChangeText={setNewKey}
                      mode="outlined"
                      style={[styles.dialogInput, { flex: 0.45, marginBottom: 0 }]}
                      activeOutlineColor="#5a4bda"
                    />
                    <TextInput
                      placeholder="Value (e.g. Red)"
                      value={newValue}
                      onChangeText={setNewValue}
                      mode="outlined"
                      style={[styles.dialogInput, { flex: 0.45, marginBottom: 0 }]}
                      activeOutlineColor="#5a4bda"
                    />
                    <IconButton
                      icon="plus"
                      mode="contained"
                      containerColor="#5a4bda"
                      iconColor="#fff"
                      onPress={addCustomDetail}
                      style={styles.addCustomBtn}
                    />
                  </View>

                  {otherDetailsList.length > 0 && (
                    <View style={styles.customFieldsList}>
                      {otherDetailsList.map((item, index) => (
                        <View key={index} style={styles.customFieldTag}>
                          <Text style={styles.customFieldTagText}>
                            <Text style={styles.boldText}>{item.key}:</Text> {item.value}
                          </Text>
                          <TouchableOpacity onPress={() => removeCustomDetail(item.key)}>
                            <List.Icon icon="close-circle" color="#d32f2f" style={styles.customFieldTagRemove} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                </Card.Content>
              </Card>

            </ScrollView>
          </SafeAreaView>
        </Modal>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: '#fff',
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
  listIcon: {
    margin: 0,
    alignSelf: 'center',
    marginLeft: 8,
  },
  listProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignSelf: 'center',
    marginLeft: 8,
  },
  actionIcons: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerSaveBtn: {
    borderRadius: 8,
    marginRight: 8,
  },
  modalScrollView: {
    flex: 1,
    padding: 16,
  },
  formSectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  dialogInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  imageSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  imageBox: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formImage: {
    width: 66,
    height: 66,
    borderRadius: 7,
  },
  imageSelectInfo: {
    marginLeft: 16,
  },
  imageSelectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanBtn: {
    marginLeft: 8,
    marginRight: 0,
    marginTop: 0,
    borderRadius: 8,
    height: 48,
    width: 48,
  },
  segmentBtns: {
    marginTop: 6,
    borderRadius: 8,
  },
  sectionSublabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  customFieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCustomBtn: {
    marginLeft: 8,
    marginRight: 0,
    marginTop: 0,
    borderRadius: 8,
    height: 44,
    width: 44,
  },
  customFieldsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  customFieldTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 2,
    marginRight: 8,
    marginBottom: 8,
  },
  customFieldTagText: {
    fontSize: 12,
    color: '#334155',
  },
  customFieldTagRemove: {
    margin: 0,
    padding: 0,
    width: 18,
    height: 18,
    marginLeft: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
  scannerDialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  scannerContent: {
    height: 250,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
});
