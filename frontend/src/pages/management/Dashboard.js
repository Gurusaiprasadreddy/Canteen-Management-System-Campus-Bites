import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, TrendingUp, DollarSign, ShoppingBag, Clock, LogOut, Settings, Sparkles, BarChart3, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/api';
import { getAuth, clearAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function ManagementDashboard() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [revenue, setRevenue] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [combos, setCombos] = useState([]);
  const [insights, setInsights] = useState(null);
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
    if (canteens.length > 0) {
      fetchData();
    }
  }, [selectedCanteen]);

  const fetchCanteens = async () => {
    try {
      const response = await api.get('/canteens');
      setCanteens(response.data);
    } catch (error) {
      console.error('Failed to load canteens');
    }
  };

  const fetchData = async () => {
    try {
      const params = selectedCanteen ? `?canteen_id=${selectedCanteen}` : '';

      const [revenueRes, topItemsRes, summaryRes, peakRes, combosRes, insightsRes] = await Promise.all([
        api.get(`/management/analytics/revenue${params}`),
        api.get(`/management/analytics/top-items${params}`),
        api.get(`/management/analytics/daily-summary${params}`),
        api.get(`/management/analytics/peak-hours${params}`),
        api.get(`/management/analytics/combos${params}`),
        api.post('/management/ai-insights')
      ]);

      setRevenue(revenueRes.data);
      setTopItems(topItemsRes.data);
      setDailySummary(summaryRes.data);
      setPeakHours(peakRes.data);
      setCombos(combosRes.data.combos || []);
      setInsights(insightsRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Set fallback data instead of showing error toast
      setRevenue({ total_revenue: 0, total_orders: 0, avg_order_value: 0 });
      setTopItems([]);
      setDailySummary({ total_orders: 0, total_revenue: 0 });
      setPeakHours({ peak_hour: "12:00 - 13:00", order_count: 0 });
      setCombos([]);
      setInsights({ insights: [], predictions: {} });
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
            <div className="flex items-center gap-2">
              <Link to="/management/menu">
                <Button variant="ghost" size="sm" className="text-white hover:text-orange-500">
                  <Settings className="w-4 h-4 mr-2" />
                  Menu Management
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:text-orange-500" data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome, {user?.name?.split(' ')[0] || user?.name} 👋</h1>
            <p className="text-gray-400">Analytics Dashboard</p>
          </div>

          {/* Canteen Filter */}
          <div className="flex gap-2">
            <Button
              variant={!selectedCanteen ? 'default' : 'outline'}
              onClick={() => setSelectedCanteen(null)}
              className={!selectedCanteen ? 'bg-orange-600' : 'border-gray-600 text-gray-300'}
            >
              All Canteens
            </Button>
            {canteens.map(canteen => (
              <Button
                key={canteen.canteen_id}
                variant={selectedCanteen === canteen.canteen_id ? 'default' : 'outline'}
                onClick={() => setSelectedCanteen(canteen.canteen_id)}
                className={selectedCanteen === canteen.canteen_id ? 'bg-orange-600' : 'border-gray-600 text-gray-300'}
              >
                {canteen.name}
              </Button>
            ))}
          </div>
        </div>

        {/* AI Insights Panel */}
        {insights && insights.insights && insights.insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold">🤖 AI Insights</h2>
            </div>
            <div className="space-y-3">
              {insights.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                  <div className="flex-1">
                    <p className="font-bold text-gray-200 text-sm">{insight.title}</p>
                    <p className="text-sm text-gray-400">{insight.message}</p>
                  </div>
                </div>
              ))}
            </div>
            {insights.predictions && insights.predictions.stock_alerts && insights.predictions.stock_alerts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-purple-500/30">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">⚠ Predictive Warnings</h3>
                {insights.predictions.stock_alerts.map((alert, index) => (
                  <div key={index} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-2">
                    <p className="text-yellow-200 text-sm">{alert}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Today's Summary Card */}
        {dailySummary && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-orange-600 to-orange-700 rounded-3xl p-6 shadow-2xl"
          >
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
                <p className="text-3xl font-bold">₹{dailySummary.revenue?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-orange-100">Peak Time</p>
                <p className="text-2xl font-bold">{dailySummary.peak_time}</p>
              </div>
              <div>
                <p className="text-sm text-orange-100">Most Ordered</p>
                <p className="text-lg font-bold truncate">{dailySummary.most_ordered_item}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Analytics Cards */}
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Peak Hours */}
          {peakHours && peakHours.peak_hours && Object.keys(peakHours.peak_hours).length > 0 && (
            <div className="glass-dark rounded-3xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-500" />
                Peak Hours
              </h2>
              <div className="space-y-3">
                {Object.entries(peakHours.peak_hours)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([time, count], index) => (
                    <div key={time} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{time}</span>
                          <span className="text-sm text-gray-400">{count} orders</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(count / Math.max(...Object.values(peakHours.peak_hours))) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {peakHours.busiest_hour && (
                <div className="mt-4 p-3 bg-blue-900/30 rounded-xl border border-blue-700">
                  <p className="text-sm text-blue-300">
                    <strong>Busiest Hour:</strong> {peakHours.busiest_hour} ({peakHours.busiest_hour_orders} orders)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Frequent Combos */}
          {combos && combos.length > 0 && (
            <div className="glass-dark rounded-3xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-500" />
                Frequent Combos
              </h2>
              <div className="space-y-3">
                {combos.slice(0, 5).map((combo, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-gray-800 rounded-xl"
                  >
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
        </div>

        {/* AI Insights */}
        {insights && (insights.insights?.length > 0 || insights.recommendations?.length > 0) && (
          <div className="glass-dark rounded-3xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-yellow-500" />
              AI Insights & Recommendations
            </h2>

            {insights.insights && insights.insights.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 text-gray-300">Key Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.insights.map((insight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-gray-800 rounded-xl border-l-4 border-yellow-500"
                    >
                      <p className="font-bold text-sm mb-1">{insight.title}</p>
                      <p className="text-xs text-gray-400">{insight.message}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {insights.recommendations && insights.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3 text-gray-300">Recommendations</h3>
                <div className="space-y-3">
                  {insights.recommendations.map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-xl border-l-4 ${rec.priority === 'high' ? 'bg-red-900/20 border-red-500' :
                        rec.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-500' :
                          'bg-green-900/20 border-green-500'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-sm">{rec.title}</p>
                        <Badge className={
                          rec.priority === 'high' ? 'bg-red-600' :
                            rec.priority === 'medium' ? 'bg-yellow-600' :
                              'bg-green-600'
                        }>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-300">{rec.suggestion}</p>
                      <p className="text-xs text-gray-500 mt-1">Category: {rec.category}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Selling Items */}
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
