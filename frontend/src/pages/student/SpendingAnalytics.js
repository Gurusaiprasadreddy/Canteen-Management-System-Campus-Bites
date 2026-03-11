import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowLeft, DollarSign, ShoppingBag, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const CATEGORY_COLORS = {
  'Breakfast':   '#f97316',
  'Main Course': '#3b82f6',
  'Snacks':      '#10b981',
  'Beverages':   '#a855f7',
  'Other':       '#6b7280',
  'Meals':       '#f59e0b',
};

const PIE_FALLBACK = [
  { name: 'Meals', value: 0 },
  { name: 'Beverages', value: 0 },
  { name: 'Snacks', value: 0 },
];

const RADAR_FALLBACK = [
  { subject: 'Protein', A: 0 },
  { subject: 'Carbs',   A: 0 },
  { subject: 'Fat',     A: 0 },
  { subject: 'Fiber',   A: 0 },
  { subject: 'Calories',A: 0 },
];

export default function SpendingAnalytics() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [analytics, setAnalytics]   = useState(null);
  const [bills, setBills]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [radarData, setRadarData]   = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!user) { navigate('/student/login'); return; }
    fetchData();
  }, [user?.user_id, navigate]);

  const fetchData = async () => {
    try {
      const [analyticsRes, billsRes, catRes, ordersRes] = await Promise.all([
        api.get('/spending/analytics'),
        api.get('/spending/bills'),
        api.get('/spending/category-breakdown'),
        api.get('/orders/my'),
      ]);
      setAnalytics(analyticsRes.data);
      setBills(billsRes.data);

      // Category pie data
      const catData = catRes.data.map(c => ({
        name: c.category,
        value: parseFloat(c.amount.toFixed(2)),
      })).filter(c => c.value > 0);
      setCategories(catData.length ? catData : PIE_FALLBACK);

      // Radar — avg macros from completed orders
      buildRadarData(ordersRes.data);
    } catch {
      setCategories(PIE_FALLBACK);
      setRadarData(RADAR_FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  const buildRadarData = (orders) => {
    const completed = orders.filter(o => o.status === 'COMPLETED');
    if (!completed.length) { setRadarData(RADAR_FALLBACK); return; }

    let protein = 0, carbs = 0, fat = 0, fiber = 0, calories = 0, count = 0;
    completed.forEach(o => {
      o.items.forEach(item => {
        const n = item.nutrition || {};
        protein   += (n.protein  || 0) * (item.quantity || 1);
        carbs     += (n.carbs    || 0) * (item.quantity || 1);
        fat       += (n.fat      || 0) * (item.quantity || 1);
        fiber     += (n.fiber    || 0) * (item.quantity || 1);
        calories  += (n.calories || 0) * (item.quantity || 1);
        count++;
      });
    });
    if (!count) { setRadarData(RADAR_FALLBACK); return; }
    // Normalise to 0-100 scale (calories/10 so it fits same chart)
    const maxCal = Math.max(calories / count, 1);
    setRadarData([
      { subject: 'Protein (g)',  A: Math.round(protein / count) },
      { subject: 'Carbs (g)',    A: Math.round(carbs / count)   },
      { subject: 'Fat (g)',      A: Math.round(fat / count)     },
      { subject: 'Fiber (g)',    A: Math.round(fiber / count)   },
      { subject: 'Calories /10', A: Math.round(calories / count / 10) },
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const hasCategory = categories.some(c => c.value > 0);
  const hasRadar    = radarData.some(d => d.A > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 h-16">
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/dashboard')} data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <span className="text-xl font-bold gradient-text">Spending Analytics</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-6 shadow-lg"
            data-testid="daily-spending">
            <DollarSign className="w-8 h-8 mb-3" />
            <h3 className="text-sm font-medium mb-1">Today's Spending</h3>
            <p className="text-3xl font-bold">₹{analytics?.daily_total?.toFixed(2) || '0.00'}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100" data-testid="weekly-spending">
            <TrendingUp className="w-8 h-8 mb-3 text-orange-600" />
            <h3 className="text-sm font-medium text-gray-600 mb-1">This Week</h3>
            <p className="text-3xl font-bold text-gray-900">₹{analytics?.weekly_total?.toFixed(2) || '0.00'}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100" data-testid="monthly-spending">
            <ShoppingBag className="w-8 h-8 mb-3 text-orange-600" />
            <h3 className="text-sm font-medium text-gray-600 mb-1">This Month</h3>
            <p className="text-3xl font-bold text-gray-900">₹{analytics?.monthly_total?.toFixed(2) || '0.00'}</p>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CHART ROW — Category Pie  +  Nutrition Radar               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Pie — Monthly Spending by Category */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
            <h2 className="text-xl font-bold mb-1 text-gray-900">Monthly Spending Breakdown</h2>
            <p className="text-xs text-gray-400 mb-5">Where your wallet goes, by food category</p>
            {!hasCategory ? (
              <div className="flex flex-col items-center justify-center h-56 text-gray-400">
                <Coffee className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No completed orders yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categories} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                    paddingAngle={3} dataKey="value" nameKey="name">
                    {categories.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS['Other']} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`₹${v}`, 'Spent']}
                    contentStyle={{ background: '#ffffff', borderRadius: 12, border: '1px solid #fed7aa' }}
                    labelStyle={{ color: '#111827', fontWeight: '700' }}
                    itemStyle={{ color: '#374151' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Radar — Avg Nutrition Profile */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
            <h2 className="text-xl font-bold mb-1 text-gray-900">Nutritional Profile</h2>
            <p className="text-xs text-gray-400 mb-5">Avg macros across your ordered meals</p>
            {!hasRadar ? (
              <div className="flex flex-col items-center justify-center h-56 text-gray-400">
                <Coffee className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Order some food to see your nutrition radar</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart cx="50%" cy="50%" outerRadius={85} data={radarData}>
                  <PolarGrid stroke="#fed7aa" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                  <Radar name="Avg" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', borderRadius: 12, border: '1px solid #fed7aa' }}
                    labelStyle={{ color: '#111827', fontWeight: '700' }}
                    itemStyle={{ color: '#374151' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* Recent Bills */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Recent Bills</h2>
          {bills.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No bills yet</p>
          ) : (
            <div className="space-y-4">
              {bills.slice(0, 10).map((bill, i) => (
                <motion.div key={bill.bill_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex justify-between items-center p-4 bg-orange-50 rounded-xl"
                  data-testid={`bill-${bill.bill_id}`}>
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
