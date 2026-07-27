import React, { useState } from 'react';
import { BottomNavigation } from 'react-native-paper';
import DashboardScreen from './DashboardScreen';
import POSScreen from './POSScreen';
import InventoryScreen from './InventoryScreen';
import CustomerScreen from './CustomerScreen';
import SyncScreen from './SyncScreen';

export default function MainScreen() {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'dashboard', title: 'Dashboard', focusedIcon: 'view-dashboard', unfocusedIcon: 'view-dashboard-outline' },
    { key: 'pos', title: 'New Bill', focusedIcon: 'calculator', unfocusedIcon: 'calculator' },
    { key: 'inventory', title: 'Inventory', focusedIcon: 'package-variant-closed', unfocusedIcon: 'package-variant-closed' },
    { key: 'customers', title: 'Customers', focusedIcon: 'account-group', unfocusedIcon: 'account-group-outline' },
    { key: 'sync', title: 'Settings', focusedIcon: 'cog', unfocusedIcon: 'cog-outline' },
  ]);

  const renderScene = BottomNavigation.SceneMap({
    dashboard: DashboardScreen,
    pos: POSScreen,
    inventory: InventoryScreen,
    customers: CustomerScreen,
    sync: SyncScreen,
  });

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      barStyle={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' }}
      activeColor="#5a4bda"
      inactiveColor="#757575"
    />
  );
}
