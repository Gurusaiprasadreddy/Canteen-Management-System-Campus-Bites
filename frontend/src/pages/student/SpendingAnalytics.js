import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowLeft, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function SpendingAnalytics() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [analytics, setAnalytics] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/student/login');
      return;
    }
    fetchData();
  }, [user?.user_id, navigate]);

  const fetchData = async () => {
    try {
      const [analyticsRes, billsRes] = await Promise.all([
        api.get('/spending/analytics'),
        api.get('/spending/bills')
      ]);
      setAnalytics(analyticsRes.data);
      setBills(billsRes.data);
    } catch (error) {
      toast.error('Failed to load spending data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 h-16">
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/dashboard')} data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="text-xl font-bold gradient-text">Spending Analytics</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-6 shadow-lg"
            data-testid="daily-spending"
          >
            <DollarSign className="w-8 h-8 mb-3" />
            <h3 className="text-sm font-medium mb-1">Today's Spending</h3>
            <p className="text-3xl font-bold">₹{analytics?.daily_total?.toFixed(2) || '0.00'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100"
            data-testid="weekly-spending"
          >
            <TrendingUp className="w-8 h-8 mb-3 text-orange-600" />
            <h3 className="text-sm font-medium text-gray-600 mb-1">This Week</h3>
            <p className="text-3xl font-bold text-gray-900">₹{analytics?.weekly_total?.toFixed(2) || '0.00'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100"
            data-testid="monthly-spending"
          >
            <TrendingUp className="w-8 h-8 mb-3 text-orange-600" />
            <h3 className="text-sm font-medium text-gray-600 mb-1">This Month</h3>
            <p className="text-3xl font-bold text-gray-900">₹{analytics?.monthly_total?.toFixed(2) || '0.00'}</p>
          </motion.div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
          <h2 className="text-2xl font-bold mb-6">Recent Bills</h2>
          {bills.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No bills yet</p>
          ) : (
            <div className="space-y-4">
              {bills.slice(0, 10).map((bill, index) => (
                <motion.div
                  key={bill.bill_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex justify-between items-center p-4 bg-orange-50 rounded-xl"
                  data-testid={`bill-${bill.bill_id}`}
                >
                  <div>
                    <p className="font-bold">{new Date(bill.timestamp).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600">{bill.items.length} items</p>
                  </div>
                  <p className="text-xl font-bold text-orange-600">₹{bill.amount.toFixed(2)}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
