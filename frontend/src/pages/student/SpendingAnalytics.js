import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowLeft, DollarSign, ShoppingBag, Coffee, Utensils, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// ── Spending Pie colours ─────────────────────────────────────────────
const PIE_COLORS = {
  Meals:      '#f97316',
  Beverages:  '#a855f7',
  Snacks:     '#10b981',
};
const PIE_FALLBACK = [
  { name: 'Meals',     value: 0 },
  { name: 'Beverages', value: 0 },
  { name: 'Snacks',    value: 0 },
];

// ── Nutritional radar fallback ───────────────────────────────────────
const NUTRITION_FALLBACK = [
  { subject: 'Protein (g)',   A: 0 },
  { subject: 'Carbs (g)',     A: 0 },
  { subject: 'Fat (g)',       A: 0 },
  { subject: 'Fiber (g)',     A: 0 },
  { subject: 'Calories /10', A: 0 },
];

// ── Flavor Profile radar fallback ────────────────────────────────────
const FLAVOR_FALLBACK = [
  { subject: 'Spicy',  A: 0 },
  { subject: 'Sweet',  A: 0 },
  { subject: 'Savory', A: 0 },
  { subject: 'Sour',   A: 0 },
  { subject: 'Rich',   A: 0 },
];

// ── Custom radar tooltip ─────────────────────────────────────────────
const RadarTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-orange-100 rounded-xl px-3 py-2 shadow text-sm">
      <p className="font-bold text-gray-800">{payload[0].payload.subject}</p>
      <p className="text-orange-600">{payload[0].value}%</p>
    </div>
  );
};

export default function SpendingAnalytics() {
  const navigate = useNavigate();
  const { user } = getAuth();

  const [analytics,   setAnalytics]   = useState(null);
  const [bills,       setBills]       = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [radarTab,    setRadarTab]    = useState('flavor'); // 'flavor' | 'nutrition'
  const [flavorData,  setFlavorData]  = useState([]);
  const [nutritionData, setNutritionData] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!user) { navigate('/student/login'); return; }
    fetchData();
  }, [user?.user_id, navigate]);

  const fetchData = async () => {
    try {
      const [analyticsRes, billsRes, catRes, ordersRes, flavorRes] = await Promise.all([
        api.get('/spending/analytics'),
        api.get('/spending/bills'),
        api.get('/spending/category-breakdown'),
        api.get('/orders/my'),
        api.get('/spending/flavor-profile'),
      ]);

      setAnalytics(analyticsRes.data);
      setBills(billsRes.data);

      // Category pie
      const catData = catRes.data
        .map(c => ({ name: c.category, value: parseFloat(c.amount.toFixed(2)) }))
        .filter(c => c.value > 0);
      setCategories(catData.length ? catData : PIE_FALLBACK);

      // Flavor radar
      const fData = flavorRes.data.map(d => ({ subject: d.subject, A: d.value }));
      setFlavorData(fData.length ? fData : FLAVOR_FALLBACK);

      // Nutritional radar from orders
      buildNutrition(ordersRes.data);
    } catch {
      setCategories(PIE_FALLBACK);
      setFlavorData(FLAVOR_FALLBACK);
      setNutritionData(NUTRITION_FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  const buildNutrition = (orders) => {
    const completed = orders.filter(o => o.status === 'COMPLETED');
    if (!completed.length) { setNutritionData(NUTRITION_FALLBACK); return; }
    let protein = 0, carbs = 0, fat = 0, fiber = 0, calories = 0, count = 0;
    completed.forEach(o => {
      o.items.forEach(item => {
        const n = item.nutrition || {};
        protein  += (n.protein  || 0) * (item.quantity || 1);
        carbs    += (n.carbs    || 0) * (item.quantity || 1);
        fat      += (n.fat      || 0) * (item.quantity || 1);
        fiber    += (n.fiber    || 0) * (item.quantity || 1);
        calories += (n.calories || 0) * (item.quantity || 1);
        count++;
      });
    });
    if (!count) { setNutritionData(NUTRITION_FALLBACK); return; }
    setNutritionData([
      { subject: 'Protein (g)',   A: Math.round(protein  / count) },
      { subject: 'Carbs (g)',     A: Math.round(carbs    / count) },
      { subject: 'Fat (g)',       A: Math.round(fat      / count) },
      { subject: 'Fiber (g)',     A: Math.round(fiber    / count) },
      { subject: 'Calories /10', A: Math.round(calories / count / 10) },
    ]);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    </div>
  );

  const hasCategory = categories.some(c => c.value > 0);
  const hasRadar    = radarTab === 'flavor'
    ? flavorData.some(d => d.A > 0)
    : nutritionData.some(d => d.A > 0);
  const radarData   = radarTab === 'flavor' ? flavorData : nutritionData;

  // Flavor emoji map
  const flavorEmoji = { Spicy: '🌶️', Sweet: '🍰', Savory: '🍛', Sour: '🍋', Rich: '🧈' };
  const dominantFlavor = radarTab === 'flavor' && flavorData.length
    ? flavorData.reduce((a, b) => (a.A >= b.A ? a : b)).subject
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 h-16">
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/dashboard')} data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <span className="text-xl font-bold gradient-text">My Analytics</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Stat Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-6 shadow-lg"
            data-testid="daily-spending">
            <DollarSign className="w-8 h-8 mb-3 opacity-80" />
            <h3 className="text-sm font-medium mb-1 opacity-90">Today's Spending</h3>
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

        {/* ── Chart Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Pie — Monthly Spending Breakdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Monthly Spending</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">Where your wallet goes — Meals, Beverages &amp; Snacks</p>

            {!hasCategory ? (
              <div className="flex flex-col items-center justify-center h-56 text-gray-400">
                <Coffee className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No completed orders yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categories} cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      paddingAngle={4} dataKey="value" nameKey="name">
                      {categories.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`₹${v}`, 'Spent']}
                      contentStyle={{ background: '#fff', borderRadius: 12, border: '1px solid #fed7aa' }}
                      labelStyle={{ color: '#111827', fontWeight: '700' }}
                      itemStyle={{ color: '#374151' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend badges */}
                <div className="flex justify-center gap-3 mt-2 flex-wrap">
                  {categories.map(c => (
                    <div key={c.name} className="flex items-center gap-1.5 text-xs bg-gray-50 rounded-full px-3 py-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[c.name] || '#6b7280' }} />
                      <span className="font-medium text-gray-700">{c.name}</span>
                      <span className="text-gray-500">₹{c.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* Radar — Flavor / Nutrition Profile with tab switcher */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">

            {/* Tab switcher */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-900">
                  {radarTab === 'flavor' ? 'Flavor Profile' : 'Nutritional Profile'}
                </h2>
              </div>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setRadarTab('flavor')}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                    radarTab === 'flavor' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🌶️ Flavor
                </button>
                <button
                  onClick={() => setRadarTab('nutrition')}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                    radarTab === 'nutrition' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  💪 Nutrition
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {radarTab === 'flavor'
                ? 'Your dominant taste preferences based on what you order'
                : 'Average macros across your completed meals'}
            </p>

            {/* Dominant flavor badge */}
            {radarTab === 'flavor' && dominantFlavor && hasRadar && (
              <div className="mb-3 inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-3 py-1 text-sm font-medium text-orange-700">
                {flavorEmoji[dominantFlavor]} You love <span className="font-bold">{dominantFlavor}</span> food!
              </div>
            )}

            {!hasRadar ? (
              <div className="flex flex-col items-center justify-center h-52 text-gray-400">
                <Coffee className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Order some food to see your profile</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart cx="50%" cy="50%" outerRadius={80} data={radarData}>
                  <PolarGrid stroke="#fed7aa" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="subject"
                    tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                  <Radar name={radarTab === 'flavor' ? 'Flavor %' : 'Avg'}
                    dataKey="A"
                    stroke={radarTab === 'flavor' ? '#f97316' : '#3b82f6'}
                    fill={radarTab === 'flavor' ? '#f97316' : '#3b82f6'}
                    fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip content={radarTab === 'flavor' ? <RadarTip /> : undefined}
                    contentStyle={{ background: '#fff', borderRadius: 12, border: '1px solid #fed7aa' }}
                    labelStyle={{ color: '#111827', fontWeight: '700' }}
                    itemStyle={{ color: '#374151' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}

            {/* Flavor percentage summary */}
            {radarTab === 'flavor' && hasRadar && (
              <div className="grid grid-cols-5 gap-1 mt-2">
                {flavorData.map(d => (
                  <div key={d.subject} className="text-center">
                    <p className="text-lg">{flavorEmoji[d.subject]}</p>
                    <p className="text-[10px] font-medium text-gray-600">{d.subject}</p>
                    <p className="text-xs font-bold text-orange-600">{d.A}%</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Recent Bills ──────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Recent Bills</h2>
          {bills.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No bills yet</p>
          ) : (
            <div className="space-y-3">
              {bills.slice(0, 10).map((bill, i) => (
                <motion.div key={bill.bill_id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex justify-between items-center p-4 bg-orange-50 rounded-xl"
                  data-testid={`bill-${bill.bill_id}`}>
                  <div>
                    <p className="font-bold text-gray-800">{new Date(bill.timestamp).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">{bill.items?.length || 0} item{bill.items?.length !== 1 ? 's' : ''}</p>
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
