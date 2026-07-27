import React, { useState, useContext } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState('');

  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoadingState(true);

    const res = await login(email, password);
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
          <Text style={styles.brandText}>Offline POS</Text>
          <Text style={styles.subtitleText}>Manage your shop billing anywhere, anytime</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Sign In</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loadingState}
              disabled={loadingState}
              style={styles.button}
              buttonColor="#5a4bda"
              labelStyle={styles.buttonLabel}
            >
              Login
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have a shop account? </Text>
              <Text
                style={styles.linkText}
                onPress={() => navigation.navigate('Register')}
              >
                Register
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  brandText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5a4bda',
    letterSpacing: 1,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  card: {
    elevation: 4,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
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
    marginTop: 24,
  },
  footerText: {
    color: '#666',
  },
  linkText: {
    color: '#5a4bda',
    fontWeight: 'bold',
  },
});
