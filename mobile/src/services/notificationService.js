let Notifications;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn('Notifications not supported in this environment:', e.message);
}

export const notificationService = {
  requestPermissions: async () => {
    if (!Notifications) {
      console.log('Notifications are disabled or unsupported.');
      return false;
    }
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (err) {
      console.warn('Failed to get notification permissions:', err.message);
      return false;
    }
  },

  triggerLowStockAlert: async (productName, remainingStock) => {
    if (!Notifications) {
      console.log(`[Low Stock Alert] ${productName} has only ${remainingStock} items left in stock.`);
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Low Stock Alert ⚠️',
          body: `Product "${productName}" is running low. Only ${remainingStock} items left in stock.`,
          data: { productName, remainingStock },
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Error triggering local push notification:', error.message);
    }
  },
};
