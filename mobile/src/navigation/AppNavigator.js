import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MainScreen from '../screens/MainScreen';
import InvoiceDetailsScreen from '../screens/InvoiceDetailsScreen';
import InvoiceHistoryScreen from '../screens/InvoiceHistoryScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5a4bda" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen 
            name="InvoiceDetails" 
            component={InvoiceDetailsScreen} 
            options={{ 
              headerShown: true, 
              title: 'Invoice Details',
              headerTintColor: '#fff',
              headerStyle: { backgroundColor: '#5a4bda' }
            }} 
          />
          <Stack.Screen 
            name="InvoiceHistory" 
            component={InvoiceHistoryScreen} 
            options={{ 
              headerShown: true, 
              title: 'Invoice History',
              headerTintColor: '#fff',
              headerStyle: { backgroundColor: '#5a4bda' }
            }} 
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
