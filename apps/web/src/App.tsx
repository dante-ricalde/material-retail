import { Routes, Route, Navigate } from 'react-router-dom';
import { MerchantPicker } from './routes/MerchantPicker';
import { Dashboard } from './routes/Dashboard';
import { ProductList } from './routes/ProductList';
import { ProductDetail } from './routes/ProductDetail';
import { ProductNew } from './routes/ProductNew';
import { Alerts } from './routes/Alerts';
import { Settings } from './routes/Settings';
import { MerchantLayout } from './components/MerchantLayout';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MerchantPicker />} />
      <Route path="/m/:slug" element={<MerchantLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductNew />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
}
