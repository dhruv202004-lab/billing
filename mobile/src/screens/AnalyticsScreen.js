import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, Portal, SegmentedButtons, Text } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/dbService';

const NAVY = '#071327';
const PANEL = '#101f39';
const MUTED = '#9aabc4';
const BLUE = '#2584ff';
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const monthStart = date => new Date(date.getFullYear(), date.getMonth(), 1);

export default function AnalyticsScreen() {
  const { user } = useContext(AuthContext);
  const isFocused = useIsFocused();
  const [period, setPeriod] = useState('month');
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedInvoices, loadedProducts] = await Promise.all([
        dbService.getInvoices(user.id), dbService.getProducts(user.id),
      ]);
      setInvoices(loadedInvoices || []);
      setProducts(loadedProducts || []);
    } catch (error) {
      console.error('Unable to load analytics:', error);
      Alert.alert('Analytics unavailable', 'Could not load local invoice and product data.');
    }
  }, [user]);

  React.useEffect(() => { if (isFocused) loadData(); }, [isFocused, loadData]);

  const report = useMemo(() => {
    const now = new Date();
    let start = null;
    let end = null;
    if (period === 'month') { start = monthStart(now); end = new Date(now.getFullYear(), now.getMonth() + 1, 1); }
    if (period === 'previous') { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = monthStart(now); }
    const selected = invoices.filter(invoice => {
      const date = new Date(invoice.created_at);
      return (!start || date >= start) && (!end || date < end);
    });
    const byId = Object.fromEntries(products.map(product => [product.id, product]));
    const totals = selected.reduce((data, invoice) => {
      data.sales += Number(invoice.total || 0);
      data.tax += Number(invoice.tax || 0);
      data.discount += Number(invoice.discount || 0);
      if (String(invoice.payment_method || '').toLowerCase() === 'credit') data.pending += Number(invoice.total || 0);
      data.payment[invoice.payment_method || 'Other'] = (data.payment[invoice.payment_method || 'Other'] || 0) + Number(invoice.total || 0);
      let items = [];
      try { items = JSON.parse(invoice.items_json || '[]'); } catch (error) { items = []; }
      items.forEach(item => {
        const quantity = Number(item.quantity || 0);
        const product = byId[item.productId] || {};
        data.cost += Number(product.purchase_price || 0) * quantity;
        const key = item.productId || item.name || 'Unknown product';
        if (!data.topProducts[key]) data.topProducts[key] = { name: item.name || product.name || 'Product', quantity: 0, sales: 0 };
        data.topProducts[key].quantity += quantity;
        data.topProducts[key].sales += Number(item.total ?? Number(item.price || 0) * quantity);
      });
      return data;
    }, { sales: 0, tax: 0, discount: 0, cost: 0, pending: 0, payment: {}, topProducts: {} });
    const trend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const value = invoices.reduce((sum, invoice) => {
        const invoiceDate = new Date(invoice.created_at);
        return invoiceDate.getFullYear() === date.getFullYear() && invoiceDate.getMonth() === date.getMonth()
          ? sum + Number(invoice.total || 0) : sum;
      }, 0);
      return { label: date.toLocaleDateString(undefined, { month: 'short' }), value };
    });
    return {
      invoices: selected, sales: totals.sales, bills: selected.length, tax: totals.tax, pending: totals.pending,
      cost: totals.cost, profit: totals.sales - totals.cost, payment: totals.payment,
      topProducts: Object.values(totals.topProducts).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
      trend, periodLabel: period === 'month' ? 'This Month' : period === 'previous' ? 'Last Month' : 'All Time',
    };
  }, [invoices, products, period]);

  const exportOrPrint = async (printOnly = false) => {
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;padding:24px;color:#14213a}h1{color:#123}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{padding:9px;border:1px solid #d5deeb;text-align:left}th{background:#eaf1ff}</style></head><body><h1>${user?.shopName || 'Business'} · Reports &amp; Analytics</h1><p>${report.periodLabel}</p><h2>Business overview</h2><p>Total sales: ${money(report.sales)} · Total bills: ${report.bills} · Tax collected: ${money(report.tax)} · Estimated net profit: ${money(report.profit)}</p><h2>Payment methods</h2><table><tr><th>Method</th><th>Sales</th></tr>${Object.entries(report.payment).map(([name, value]) => `<tr><td>${name}</td><td>${money(value)}</td></tr>`).join('')}</table><h2>Top selling products</h2><table><tr><th>Product</th><th>Units</th><th>Sales</th></tr>${report.topProducts.map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${money(item.sales)}</td></tr>`).join('')}</table></body></html>`;
    setBusy(true);
    try {
      if (printOnly) await Print.printAsync({ html });
      else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Reports and Analytics', UTI: '.pdf' });
        else Alert.alert('Export unavailable', 'File sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Report export failed:', error);
      Alert.alert('Could not create report', 'Please try again.');
    } finally { setBusy(false); }
  };

  const metricCard = (label, value, detail, color, icon) => (
    <View key={label} style={[styles.metricCard, { backgroundColor: color }]}>
      <View style={styles.metricIcon}><Text style={{ fontSize: 21 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.metricLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text><Text style={styles.metricDetail}>{detail}</Text></View>
    </View>
  );

  const reports = {
    'Sales Report': report.invoices.map(item => `#${item.invoice_number} · ${item.customer_name} · ${money(item.total)}`),
    'Payment Report': Object.entries(report.payment).map(([method, total]) => `${method} · ${money(total)}`),
    'Product Report': report.topProducts.map(item => `${item.name} · ${item.quantity} units · ${money(item.sales)}`),
    'GST Report': [`Tax collected · ${money(report.tax)}`, `Discounts · ${money(report.invoices.reduce((sum, invoice) => sum + Number(invoice.discount || 0), 0))}`],
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandIcon}><Text style={{ color: '#fff', fontSize: 25 }}>▥</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.title}>Reports &amp; Analytics</Text><Text style={styles.subtitle}>Business performance overview</Text></View>
          <IconButton icon="refresh" iconColor="#fff" onPress={loadData} accessibilityLabel="Refresh analytics" />
        </View>
        <View style={styles.toolbar}>
          <SegmentedButtons value={period} onValueChange={setPeriod} buttons={[
            { value: 'month', label: 'This Month' }, { value: 'previous', label: 'Last Month' }, { value: 'all', label: 'All Time' },
          ]} theme={{ colors: { secondaryContainer: '#17325a', onSecondaryContainer: '#fff', outline: '#29405f', onSurface: '#d7e4fa' } }} />
          <View style={styles.actionRow}>
            <Button mode="outlined" icon="download" loading={busy} disabled={busy} textColor="#9ed8ff" onPress={() => exportOrPrint(false)}>Export PDF</Button>
            <Button mode="outlined" icon="printer" disabled={busy} textColor="#9ed8ff" onPress={() => exportOrPrint(true)}>Print</Button>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          {metricCard('Total Sales', money(report.sales), `${report.bills} bills in ${report.periodLabel.toLowerCase()}`, '#0757b9', '₹')}
          {metricCard('Total Bills', String(report.bills), 'Invoices in selected period', '#5124a7', '▤')}
          {metricCard('Pending Amount', money(report.pending), 'Credit bills in this period', '#914b0b', '💳')}
          {metricCard('Net Profit', money(report.profit), 'Estimated from purchase prices', '#00765f', '↗')}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeading}><Text style={styles.panelIcon}>▥</Text><View><Text style={styles.panelTitle}>Sales Overview</Text><Text style={styles.panelSub}>Monthly sales trend · last 6 months</Text></View></View>
          <View style={styles.chart}>
            {report.trend.map(point => {
              const peak = Math.max(1, ...report.trend.map(item => item.value));
              return <View key={point.label} style={styles.barColumn}>
                <Text style={styles.barValue}>{point.value ? money(point.value) : ''}</Text>
                <View style={[styles.bar, { height: Math.max(4, point.value / peak * 110) }]} />
                <Text style={styles.axisLabel}>{point.label}</Text>
              </View>;
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeading}><Text style={styles.panelIcon}>▰</Text><View><Text style={styles.panelTitle}>Payment Methods</Text><Text style={styles.panelSub}>{report.bills} bills · {money(report.sales)} total</Text></View></View>
          {Object.entries(report.payment).length ? Object.entries(report.payment).sort((a, b) => b[1] - a[1]).map(([method, amount], index) => (
            <View key={method} style={styles.paymentRow}>
              <View style={[styles.dot, { backgroundColor: ['#12a8ff', '#12c98a', '#a342f5', '#ffb321'][index % 4] }]} />
              <Text style={styles.paymentName}>{method}</Text><Text style={styles.paymentAmount}>{money(amount)}</Text>
              <Text style={styles.paymentPercent}>{report.sales ? `${Math.round(amount / report.sales * 100)}%` : '0%'}</Text>
            </View>
          )) : <Text style={styles.empty}>No payment data for this period.</Text>}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeading}><Text style={styles.panelIcon}>⚡</Text><Text style={styles.panelTitle}>Quick Reports</Text></View>
          <View style={styles.quickGrid}>{[
            ['Sales Report', '▤', '#0d5cae'], ['Payment Report', '▰', '#077a60'], ['Product Report', '◆', '#5124a7'], ['GST Report', '▦', '#94520a'],
          ].map(([name, icon, color]) => <Button key={name} mode="contained" icon={icon === '▤' ? 'file-chart-outline' : icon === '▰' ? 'credit-card-outline' : icon === '◆' ? 'package-variant-closed' : 'calculator-variant-outline'} compact style={[styles.quickButton, { backgroundColor: color }]} contentStyle={{ height: 64 }} labelStyle={{ fontSize: 11 }} onPress={() => setActiveReport(name)}>{name}</Button>)}</View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeading}><Text style={styles.panelIcon}>🏆</Text><Text style={styles.panelTitle}>Top Selling Products</Text></View>
          {report.topProducts.length ? report.topProducts.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.productRow}><View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View><Text numberOfLines={1} style={styles.productName}>{item.name}</Text><Text style={styles.productUnits}>{item.quantity} sold</Text><Text style={styles.productSales}>{money(item.sales)}</Text></View>
          )) : <Text style={styles.empty}>No product sales for this period.</Text>}
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={!!activeReport} onDismiss={() => setActiveReport(null)} style={{ backgroundColor: PANEL, maxHeight: '80%' }}>
          <Dialog.Title style={{ color: '#fff' }}>{activeReport}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 440 }}><ScrollView>
            {(reports[activeReport] || []).length ? reports[activeReport].map((line, index) => <Text key={`${line}-${index}`} style={styles.dialogRow}>{line}</Text>) : <Text style={styles.empty}>No records for {report.periodLabel.toLowerCase()}.</Text>}
          </ScrollView></Dialog.ScrollArea>
          <Dialog.Actions><Button textColor="#6fc5ff" onPress={() => setActiveReport(null)}>Close</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  content: { padding: 16, paddingTop: 42, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  brandIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#155cf5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { color: '#f3f7ff', fontSize: 21, fontWeight: 'bold' }, subtitle: { color: '#aebbd0', marginTop: 2 },
  toolbar: { marginBottom: 14 }, actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 9, marginBottom: 14 },
  metricCard: { width: '48.5%', minHeight: 106, borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  metricIcon: { width: 38, height: 38, borderRadius: 22, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
  metricLabel: { color: '#e3edff', fontSize: 11 }, metricValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 3 }, metricDetail: { color: '#d6e4fa', fontSize: 9, marginTop: 4 },
  panel: { backgroundColor: PANEL, borderColor: '#213451', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 13 },
  panelHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 13, gap: 10 }, panelIcon: { fontSize: 20, color: '#26aaff' }, panelTitle: { color: '#f4f7fc', fontWeight: 'bold', fontSize: 15 }, panelSub: { color: MUTED, fontSize: 11, marginTop: 2 },
  chart: { height: 168, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderColor: '#40516b', paddingTop: 16 },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }, bar: { width: '55%', minWidth: 20, backgroundColor: BLUE, borderTopLeftRadius: 5, borderTopRightRadius: 5 }, barValue: { color: '#c8d7ef', fontSize: 9, marginBottom: 4 }, axisLabel: { color: MUTED, fontSize: 10, marginTop: 5 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#2b3d58' }, dot: { width: 9, height: 9, borderRadius: 5, marginRight: 9 }, paymentName: { flex: 1, color: '#e7edf7' }, paymentAmount: { color: '#d8e3f3', marginRight: 12 }, paymentPercent: { color: '#a9bbd3', width: 40, textAlign: 'right' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, quickButton: { flexGrow: 1, flexBasis: '47%', borderRadius: 10 },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#2b3d58', gap: 8 }, rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#203d65', alignItems: 'center', justifyContent: 'center' }, rankText: { color: '#cfe2ff', fontWeight: 'bold' }, productName: { flex: 1, color: '#eff4fc' }, productUnits: { color: MUTED, fontSize: 11 }, productSales: { color: '#e9f2ff', fontWeight: '600', minWidth: 58, textAlign: 'right' },
  empty: { color: MUTED, paddingVertical: 8 }, dialogRow: { color: '#e8effa', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#34445d' },
});
