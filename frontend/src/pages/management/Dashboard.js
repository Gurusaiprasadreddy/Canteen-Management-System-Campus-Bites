import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Utensils, TrendingUp, DollarSign, ShoppingBag, Clock,
  LogOut, Settings, Sparkles, BarChart3, Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/api';
import { getAuth, clearAuth } from '@/utils/auth';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#f59e0b', '#06b6d4'];

const EmptyChart = ({ label }) => (
  <div className="flex flex-col items-center justify-center h-48 text-gray-500">
    <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
    <p className="text-sm">{label || 'No data yet — place some orders first'}</p>
  </div>
);

const CustomTooltipRevenue = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-orange-200 rounded-xl p-3 text-sm shadow-lg">
      <p className="text-gray-700 mb-1 font-bold">{label}</p>
      <p className="text-orange-600 font-bold">₹{payload[0]?.value?.toFixed(2)}</p>
      <p className="text-blue-600">{payload[1]?.value} orders</p>
    </div>
  );
};

export default function ManagementDashboard() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [revenue, setRevenue] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [combos, setCombos] = useState([]);
  const [insights, setInsights] = useState(null);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCanteen, setSelectedCanteen] = useState(null);
  const [canteens, setCanteens] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'management') {
      navigate('/management/login');
      return;
    }
    fetchCanteens();
    fetchData();
  }, [user?.user_id, navigate]);

  useEffect(() => {
    if (canteens.length > 0) fetchData();
  }, [selectedCanteen]);

  const fetchCanteens = async () => {
    try {
      const res = await api.get('/canteens');
      setCanteens(res.data);
    } catch {}
  };

  const fetchData = async () => {
    try {
      const params = selectedCanteen ? `?canteen_id=${selectedCanteen}` : '';
      const [revenueRes, topItemsRes, summaryRes, peakRes, combosRes, insightsRes, weeklyRes] = await Promise.all([
        api.get(`/management/analytics/revenue${params}`),
        api.get(`/management/analytics/top-items${params}`),
        api.get(`/management/analytics/daily-summary${params}`),
        api.get(`/management/analytics/peak-hours${params}`),
        api.get(`/management/analytics/combos${params}`),
        api.post('/management/ai-insights'),
        api.get(`/management/analytics/weekly-revenue${params}`)
      ]);
      setRevenue(revenueRes.data);
      setTopItems(topItemsRes.data);
      setDailySummary(summaryRes.data);
      setPeakHours(peakRes.data);
      setCombos(combosRes.data.combos || []);
      setInsights(insightsRes.data);
      setWeeklyRevenue(weeklyRes.data);
    } catch (error) {
      setRevenue({ total_revenue: 0, total_orders: 0, avg_order_value: 0 });
      setTopItems([]);
      setDailySummary({ total_orders: 0, total_revenue: 0 });
      setPeakHours({ peak_hour: '12:00 - 13:00', order_count: 0 });
      setCombos([]);
      setInsights({ insights: [], predictions: {} });
      setWeeklyRevenue([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    navigate('/management/login');
  };

  // Derived data
  const peakHoursData = peakHours?.peak_hours
    ? Object.entries(peakHours.peak_hours)
        .map(([time, count]) => ({ time: `${time}:00`, orders: count }))
        .sort((a, b) => a.time.localeCompare(b.time))
    : [];

  const topItemsChart = topItems.slice(0, 8).map(it => ({
    name: it.name?.length > 14 ? it.name.slice(0, 14) + '…' : (it.name || it._id || 'Item'),
    quantity: it.quantity,
    revenue: parseFloat(it.revenue?.toFixed(2) || 0)
  }));

  // Donut: order status from daily summary vs total
  const orderStatusData = [
    { name: 'Completed Today', value: dailySummary?.total_orders || 0, color: '#10b981' },
    { name: 'Total Orders', value: Math.max(0, (revenue?.total_orders || 0) - (dailySummary?.total_orders || 0)), color: '#3b82f6' },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
            <div className="flex items-center gap-2">
              <Link to="/management/menu">
                <Button variant="ghost" size="sm" className="text-white hover:text-orange-500">
                  <Settings className="w-4 h-4 mr-2" /> Menu Management
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:text-orange-500" data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header + Canteen Filter */}
        <div className="mb-8 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-1">Welcome, {user?.name?.split(' ')[0] || user?.name} 👋</h1>
            <p className="text-gray-400">Analytics Dashboard</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!selectedCanteen ? 'default' : 'outline'}
              onClick={() => setSelectedCanteen(null)}
              className={!selectedCanteen ? 'bg-orange-600' : 'border-gray-600 text-gray-300'}
            >All Canteens</Button>
            {canteens.map(c => (
              <Button
                key={c.canteen_id}
                variant={selectedCanteen === c.canteen_id ? 'default' : 'outline'}
                onClick={() => setSelectedCanteen(c.canteen_id)}
                className={selectedCanteen === c.canteen_id ? 'bg-orange-600' : 'border-gray-600 text-gray-300'}
              >{c.name}</Button>
            ))}
          </div>
        </div>

        {/* AI Insights Panel */}
        {insights?.insights?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold">🤖 AI Insights</h2>
            </div>
            <div className="space-y-3">
              {insights.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                  <div className="flex-1">
                    <p className="font-bold text-gray-200 text-sm">{insight.title}</p>
                    <p className="text-sm text-gray-400">{insight.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Today's Summary */}
        {dailySummary && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-orange-600 to-orange-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Today's Summary</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-orange-100">Total Orders</p>
                <p className="text-3xl font-bold">{dailySummary.total_orders}</p>
              </div>
              <div>
                <p className="text-sm text-orange-100">Revenue</p>
                <p className="text-3xl font-bold">₹{(dailySummary.total_revenue || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-orange-100">Peak Time</p>
                <p className="text-2xl font-bold">{peakHours?.busiest_hour || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-orange-100">Avg Order</p>
                <p className="text-2xl font-bold">₹{(revenue?.avg_order_value || 0).toFixed(2)}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-dark rounded-3xl p-6" data-testid="total-revenue">
            <DollarSign className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="text-sm text-gray-400 mb-1">Total Revenue</h3>
            <p className="text-3xl font-bold">₹{revenue?.total_revenue?.toFixed(2) || '0.00'}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-dark rounded-3xl p-6" data-testid="total-orders">
            <ShoppingBag className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="text-sm text-gray-400 mb-1">Total Orders</h3>
            <p className="text-3xl font-bold">{revenue?.total_orders || 0}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-dark rounded-3xl p-6" data-testid="avg-order-value">
            <TrendingUp className="w-8 h-8 text-orange-500 mb-3" />
            <h3 className="text-sm text-gray-400 mb-1">Avg Order Value</h3>
            <p className="text-3xl font-bold">₹{revenue?.avg_order_value?.toFixed(2) || '0.00'}</p>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CHART ROW 1 — Revenue Trend (Area) + Order Status (Donut) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Area Chart — Weekly Revenue */}
          <div className="glass-dark rounded-3xl p-6 lg:col-span-2">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" /> Revenue Trend (Last 7 Days)
            </h2>
            {weeklyRevenue.length === 0 || weeklyRevenue.every(d => d.revenue === 0) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={weeklyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltipRevenue />} />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2}
                    fill="url(#revGrad)" name="Revenue (₹)" />
                  <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2}
                    fill="url(#ordGrad)" name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut — Overall Order Split */}
          <div className="glass-dark rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-400" /> Order Status
            </h2>
            {orderStatusData.length === 0 ? (
              <EmptyChart label="No orders yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={4} dataKey="value">
                    {orderStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, '']} contentStyle={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 12, color: '#111827' }} />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CHART ROW 2 — Top Items (H-Bar) + Peak Hours (V-Bar)       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Horizontal Bar — Top Selling Items */}
          <div className="glass-dark rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" /> Top Selling Items
            </h2>
            {topItemsChart.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topItemsChart} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 12, color: '#111827' }}
                    labelStyle={{ color: '#111827', fontWeight: '700' }}
                    itemStyle={{ color: '#374151' }}
                    formatter={(v, name) => [name === 'revenue' ? `₹${v}` : v, name === 'revenue' ? 'Revenue' : 'Qty']}
                  />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  <Bar dataKey="quantity" fill="#f97316" radius={[0, 4, 4, 0]} name="Qty Sold" />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Vertical Bar — Peak Rush Hours */}
          <div className="glass-dark rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" /> Peak Rush Hours
            </h2>
            {peakHoursData.length === 0 ? (
              <EmptyChart />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={peakHoursData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 12, color: '#111827' }}
                      labelStyle={{ color: '#111827', fontWeight: '700' }}
                      itemStyle={{ color: '#374151' }}
                      formatter={(v) => [`${v} orders`, 'Volume']}
                    />
                    <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                      {peakHoursData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {peakHours?.busiest_hour && (
                  <div className="mt-3 p-3 bg-blue-900/30 rounded-xl border border-blue-700">
                    <p className="text-sm text-blue-300">
                      <strong>Busiest Hour:</strong> {peakHours.busiest_hour} — {peakHours.busiest_hour_orders} orders
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Frequent Combos + AI Recommendations */}
        {combos?.length > 0 && (
          <div className="glass-dark rounded-3xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-500" /> Frequent Combos
            </h2>
            <div className="space-y-3">
              {combos.slice(0, 5).map((combo, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }} className="p-4 bg-gray-800 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-sm">{combo.item1} + {combo.item2}</p>
                      <p className="text-xs text-gray-400">Ordered together {combo.frequency} times</p>
                    </div>
                    <Badge className="bg-purple-600">{combo.confidence}%</Badge>
                  </div>
                  <p className="text-xs text-purple-300 mt-2">💡 {combo.suggestion}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights full section */}
        {insights && (insights.insights?.length > 0 || insights.recommendations?.length > 0) && (
          <div className="glass-dark rounded-3xl p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-yellow-500" /> AI Insights & Recommendations
            </h2>
            {insights.recommendations?.length > 0 && (
              <div className="space-y-3">
                {insights.recommendations.map((rec, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-4 rounded-xl border-l-4 ${rec.priority === 'high' ? 'bg-red-900/20 border-red-500' :
                      rec.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-500' : 'bg-green-900/20 border-green-500'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-sm">{rec.title}</p>
                      <Badge className={rec.priority === 'high' ? 'bg-red-600' : rec.priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-300">{rec.suggestion}</p>
                    <p className="text-xs text-gray-500 mt-1">Category: {rec.category}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
