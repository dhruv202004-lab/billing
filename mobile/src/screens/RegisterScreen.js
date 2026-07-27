import React, { useState, useContext } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Card, Chip } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';

const CATEGORIES = ['Retail', 'Clothing', 'Grocery', 'Restaurant', 'Electronics', 'Other'];

export default function RegisterScreen({ navigation }) {
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState('Retail');
  const [phone, setPhone] = useState('');
  
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState('');

  const { register } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!ownerName || !email || !password || !shopName || !phone) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setError('');
    setLoadingState(true);

    const res = await register({
      ownerName,
      email,
      password,
      shopName,
      shopCategory,
      phone,
    });
    setLoadingState(false);
    if (!res.success) {
      setError(res.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brandText}>Create Shop Account</Text>
          <Text style={styles.subtitleText}>Set up your profile and start billing off-grid</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TextInput
              label="Owner Name"
              value={ownerName}
              onChangeText={(text) => { setOwnerName(text); setError(''); }}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#5a4bda"
            />

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              activeOutlineColor="#5a4bda"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => { setPassword(text); setError(''); }}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              activeOutlineColor="#5a4bda"
            />

            <TextInput
              label="Shop Name"
              value={shopName}
              onChangeText={(text) => { setShopName(text); setError(''); }}
              mode="outlined"
              style={styles.input}
              activeOutlineColor="#5a4bda"
            />

            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={(text) => { setPhone(text); setError(''); }}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              activeOutlineColor="#5a4bda"
            />

            <Text style={styles.sectionLabel}>Shop Category</Text>
            <View style={styles.chipContainer}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  selected={shopCategory === cat}
                  onPress={() => setShopCategory(cat)}
                  style={[styles.chip, shopCategory === cat ? styles.selectedChip : null]}
                  textStyle={{ color: shopCategory === cat ? '#fff' : '#5a4bda', fontWeight: '600' }}
                  selectedColor={shopCategory === cat ? '#fff' : '#5a4bda'}
                  showSelectedOverlay={false}
                >
                  {cat}
                </Chip>
              ))}
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loadingState}
              disabled={loadingState}
              style={styles.button}
              buttonColor="#5a4bda"
              labelStyle={styles.buttonLabel}
            >
              Register Shop
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Text
                style={styles.linkText}
                onPress={() => navigation.navigate('Login')}
              >
                Login
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5a4bda',
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
  },
  card: {
    elevation: 4,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginTop: 4,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  chip: {
    margin: 4,
    backgroundColor: '#eaeaf5',
  },
  selectedChip: {
    backgroundColor: '#5a4bda',
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
  },
  linkText: {
    color: '#5a4bda',
    fontWeight: 'bold',
  },
});
