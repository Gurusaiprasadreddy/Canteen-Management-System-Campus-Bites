import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, TrendingUp, DollarSign, ShoppingBag, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';
import { getAuth, clearAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function ManagementDashboard() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [revenue, setRevenue] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'management') {
      navigate('/management/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [revenueRes, topItemsRes] = await Promise.all([
        api.get('/management/analytics/revenue'),
        api.get('/management/analytics/top-items')
      ]);
      setRevenue(revenueRes.data);
      setTopItems(topItemsRes.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    navigate('/management/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-800/80 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Utensils className="w-6 h-6 text-orange-500" />
              <span className="text-xl font-bold">Management Portal</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:text-orange-500" data-testid="logout-btn">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome, {user?.name}!</h1>
          <p className="text-gray-400">Analytics Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-dark rounded-3xl p-6" data-testid="total-revenue">
            <DollarSign className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="text-sm text-gray-400 mb-1">Total Revenue</h3>
            <p className="text-3xl font-bold">₹{revenue?.total_revenue?.toFixed(2) || '0.00'}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-dark rounded-3xl p-6" data-testid="total-orders">
            <ShoppingBag className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="text-sm text-gray-400 mb-1">Total Orders</h3>
            <p className="text-3xl font-bold">{revenue?.total_orders || 0}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-dark rounded-3xl p-6" data-testid="avg-order-value">
            <TrendingUp className="w-8 h-8 text-orange-500 mb-3" />
            <h3 className="text-sm text-gray-400 mb-1">Avg Order Value</h3>
            <p className="text-3xl font-bold">₹{revenue?.average_order_value?.toFixed(2) || '0.00'}</p>
          </motion.div>
        </div>

        <div className="glass-dark rounded-3xl p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            Top Selling Items
          </h2>

          {topItems.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No data available yet</p>
          ) : (
            <div className="space-y-4">
              {topItems.map((item, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex justify-between items-center p-4 bg-gray-800 rounded-xl" data-testid={`top-item-${index}`}>
                  <div>
                    <p className="font-bold text-lg">{item.item_name}</p>
                    <p className="text-sm text-gray-400">Sold: {item.quantity} times</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">₹{item.revenue.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Revenue</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
