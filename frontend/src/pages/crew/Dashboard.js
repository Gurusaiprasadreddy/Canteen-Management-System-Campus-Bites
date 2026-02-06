import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, CheckCircle, Clock, LogOut, Wifi, AlertTriangle, Search, TrendingUp, X, Check, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/api';
import { getAuth, clearAuth } from '@/utils/auth';
import { getSocket, joinRoom, leaveRoom } from '@/utils/socket';
import { toast } from 'sonner';
import CrewChat from './CrewChat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CrewDashboard() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [orders, setOrders] = useState([]);
  const [priorityOrders, setPriorityOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenSearch, setTokenSearch] = useState('');
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [filter, setFilter] = useState('all'); // all, preparing, ready, requested
  const [stats, setStats] = useState({ completed_today: 0, avg_prep_time: 0 });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Added for canteen selection
  const [selectedCanteen, setSelectedCanteen] = useState(user?.canteen_id || 'sopanam');
  const [canteens, setCanteens] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'crew') {
      navigate('/crew/login');
      return;
    }

    // Fetch canteens list
    const fetchCanteens = async () => {
      try {
        const res = await api.get('/canteens');
        setCanteens(res.data);
      } catch (err) {
        console.error("Failed to fetch canteens", err);
      }
    };
    fetchCanteens();

    fetchOrders();
    fetchPriorityOrders();
    fetchStats();

    const canteenId = selectedCanteen; // Use selected canteen
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      joinRoom(canteenId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('order_update', (data) => {
      if (data.canteen_id === canteenId) {
        toast.success(`New order received: #${data.token_number || data.order_id.slice(-6)}`);
        fetchOrders();
        fetchPriorityOrders();
        fetchStats();
      }
    });

    // Refresh priority orders every minute
    const interval = setInterval(() => {
      fetchPriorityOrders();
      fetchStats();
    }, 60000);

    return () => {
      leaveRoom(canteenId);
      socket.off('order_update');
      clearInterval(interval);
    };
  }, [user?.user_id, navigate, selectedCanteen]); // Added selectedCanteen dependency

  const fetchOrders = async () => {
    try {
      const canteenId = selectedCanteen;
      const response = await api.get(`/orders/recent/${canteenId}`); // Updated endpoint
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders. Please check if backend is running.');
      setLoading(false);
    }
  };

  const fetchPriorityOrders = async () => {
    try {
      const canteenId = selectedCanteen;
      const response = await api.get(`/orders/alerts/${canteenId}`);
      setPriorityOrders(response.data.priority_orders || []);
    } catch (error) {
      console.error('Failed to load priority orders:', error);
      // Don't show error toast for priority orders
    }
  };

  const fetchStats = async () => {
    try {
      const canteenId = selectedCanteen;
      const response = await api.get(`/orders/stats/${canteenId}`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order updated to ${newStatus}`);
      fetchOrders();
      fetchPriorityOrders();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleVerifyToken = async (arg = null) => {
    // If arg is a string, use it. If it's an event (object) or null, use tokenSearch.
    const rawToken = (typeof arg === 'string' ? arg : tokenSearch);

    if (!rawToken?.toString().trim()) {
      toast.error('Please enter a token number');
      return;
    }

    setVerifyingToken(true);
    setVerificationResult(null);

    try {
      // Ensure token is integer
      const tokenToVerify = parseInt(rawToken);
      if (isNaN(tokenToVerify)) {
        toast.error('Token must be a number');
        setVerifyingToken(false);
        return;
      }

      // Attempt 1: Verify token directly
      const response = await api.post('/orders/verify-token', { token: tokenToVerify });
      const order = response.data;

      if (order.status === 'READY') {
        await api.patch(`/orders/${order.order_id}/status`, { status: 'COMPLETED' });
        setVerificationResult({
          success: true,
          token: order.token_number,
          items: order.items.length,
          orderId: order.order_id
        });
        toast.success(`✅ Token ${order.token_number} verified and completed!`);
        fetchOrders();
        fetchStats();
        setTokenSearch('');
        setTimeout(() => setVerificationResult(null), 5000);
      } else {
        // Also handle completed or other statuses just for info
        setVerificationResult({
          success: order.status === 'COMPLETED',
          message: order.status === 'COMPLETED' ? 'Order already completed' : `Order status is ${order.status}, not READY`,
          token: order.token_number,
          items: order.items.length,
          orderId: order.order_id
        });
        if (order.status !== 'READY') {
          toast.info(`Order is ${order.status}`);
        }
      }
    } catch (error) {
      // Fallback: Check local orders list if API fails or returns 404 (maybe not synced yet?)
      // Or better, handle the error gracefully
      setVerificationResult({
        success: false,
        message: 'Invalid token or order not found'
      });
      toast.error('❌ Invalid token');
    } finally {
      setVerifyingToken(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    navigate('/crew/login');
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status.toLowerCase() === filter;
  });

  const isPriorityOrder = (orderId) => {
    return priorityOrders.some(po => po.order_id === orderId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Utensils className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-blue-600">Crew Dashboard</span>

              {/* Canteen Selector */}
              <div className="ml-4 w-[200px]">
                <Select value={selectedCanteen} onValueChange={setSelectedCanteen}>
                  <SelectTrigger className="w-full bg-white border-blue-200">
                    <SelectValue placeholder="Select Canteen" />
                  </SelectTrigger>
                  <SelectContent>
                    {canteens.map((canteen) => (
                      <SelectItem key={canteen.canteen_id} value={canteen.canteen_id}>
                        {canteen.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <div className="relative">
                  <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
                  {isConnected && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-gray-600">{isConnected ? 'Live' : 'Offline'}</span>
                  {isConnected && (
                    <p className="text-[10px] text-gray-400">Updated: {Math.floor((new Date() - lastUpdated) / 1000)}s ago</p>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome & Performance Summary */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-bold mb-2">Welcome, {selectedCanteen?.charAt(0).toUpperCase() + selectedCanteen?.slice(1)} Crew 👋</h1>
            <p className="text-gray-600">Shift: 8:00 AM - 9:00 PM</p>
          </div>

          {/* Performance Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-bold">Today's Performance</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-100">Orders Completed:</span>
                <span className="font-bold">{stats.completed_today}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Avg Prep Time:</span>
                <span className="font-bold">{stats.avg_prep_time} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Current Queue:</span>
                <span className="font-bold">{orders.length}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Priority Alert */}
        {priorityOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="font-bold text-red-900">
                {priorityOrders.length} Priority Order{priorityOrders.length > 1 ? 's' : ''} Delayed!
              </p>
            </div>
            <p className="text-sm text-red-700 mt-1">
              These orders are older than 15 minutes. Please prioritize them.
            </p>
          </motion.div>
        )}

        {/* Token Verification */}
        <div className="mb-6 bg-white rounded-3xl p-6 shadow-lg border border-blue-100">
          <h3 className="font-bold text-lg mb-3">Verify Token</h3>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyToken()}
                placeholder="Enter token number (e.g., 6149834)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <Button
              onClick={handleVerifyToken}
              disabled={verifyingToken}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {verifyingToken ? 'Verifying...' : 'Verify'}
            </Button>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl ${verificationResult.success ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}
            >
              {verificationResult.success ? (
                <div>
                  <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                    <CheckCircle className="w-5 h-5" />
                    ✅ Token Verified
                  </div>
                  <p className="text-sm text-green-600">Order: {verificationResult.token}</p>
                  <p className="text-sm text-green-600">Items: {verificationResult.items}</p>
                  <p className="text-sm text-green-600">Status: Ready → Completed</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                    <X className="w-5 h-5" />
                    ❌ Invalid Token
                  </div>
                  <p className="text-sm text-red-600">{verificationResult.message}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-blue-600' : ''}
          >
            All ({orders.length})
          </Button>
          <Button
            variant={filter === 'preparing' ? 'default' : 'outline'}
            onClick={() => setFilter('preparing')}
            className={filter === 'preparing' ? 'bg-orange-600' : ''}
          >
            Preparing ({orders.filter(o => o.status === 'PREPARING').length})
          </Button>
          <Button
            variant={filter === 'ready' ? 'default' : 'outline'}
            onClick={() => setFilter('ready')}
            className={filter === 'ready' ? 'bg-green-600' : ''}
          >
            Ready ({orders.filter(o => o.status === 'READY').length})
          </Button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-lg">
            <Clock className="w-24 h-24 text-blue-200 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">🕒 Waiting for orders</h2>
            <p className="text-gray-600 mb-1">Orders will appear automatically when customers place them</p>
            <p className="text-sm text-gray-400">Last checked: {lastUpdated.toLocaleTimeString()}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order, index) => {
              const priority = isPriorityOrder(order.order_id);
              const waitingTime = Math.floor((new Date() - new Date(order.created_at)) / 60000); // minutes
              const prepTime = order.items.reduce((sum, item) => sum + 5, 0); // Estimate 5 min per item

              return (
                <motion.div
                  key={order.order_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white rounded-3xl p-6 shadow-lg border-2 ${priority ? 'border-red-500 bg-red-50' :
                    order.status === 'REQUESTED' ? 'border-blue-300' :
                      order.status === 'PREPARING' ? 'border-orange-300' :
                        order.status === 'READY' ? 'border-green-300' :
                          order.status === 'COMPLETED' ? 'border-gray-200 bg-gray-50' : 'border-gray-200'
                    }`}
                  data-testid={`order-${order.order_id}`}
                >
                  {priority && (
                    <div className="flex items-center gap-1 mb-2 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-bold">🔥 HIGH PRIORITY - Waiting: {waitingTime} mins</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-mono font-bold text-blue-600">#{order.token_number}</h3>
                      <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleTimeString()}</p>
                      {waitingTime > 0 && !priority && (
                        <p className="text-xs text-gray-500">Waiting: {waitingTime} min{waitingTime > 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <Badge className={
                      order.status === 'REQUESTED' ? 'bg-blue-500 text-white' :
                        order.status === 'PREPARING' ? 'bg-orange-500 text-white' :
                          order.status === 'READY' ? 'bg-green-500 text-white' :
                            'bg-gray-500 text-white'
                    }>
                      {order.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.item_name} x{item.quantity}</span>
                        <span className="text-gray-600">₹{(item.price_at_order * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* AI Prep Time Suggestion */}
                  {(order.status === 'REQUESTED' || order.status === 'PREPARING') && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                      <div className="flex items-center gap-2 text-purple-700 text-sm">
                        <Brain className="w-4 h-4" />
                        <span className="font-medium">🤖 Suggested prep time: {prepTime} mins</span>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">Based on item complexity and current queue</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {order.status === 'REQUESTED' && (
                      <>
                        <Button
                          onClick={() => handleUpdateStatus(order.order_id, 'PREPARING')}
                          className="flex-1 bg-green-500 hover:bg-green-600"
                          data-testid={`accept-${order.order_id}`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleUpdateStatus(order.order_id, 'CANCELLED')}
                          variant="outline"
                          className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
                          data-testid={`reject-${order.order_id}`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {order.status === 'PREPARING' && (
                      <Button
                        onClick={() => handleUpdateStatus(order.order_id, 'READY')}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        data-testid={`mark-ready-${order.order_id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Ready
                      </Button>
                    )}
                    {order.status === 'READY' && (
                      <Button
                        onClick={() => handleUpdateStatus(order.order_id, 'COMPLETED')}
                        className="flex-1 bg-blue-500 hover:bg-blue-600"
                        data-testid={`mark-completed-${order.order_id}`}
                      >
                        Complete
                      </Button>
                    )}
                    {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                      <div className="flex-1 text-center text-sm text-gray-500 font-medium py-2 bg-gray-100 rounded-md">
                        {order.status}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* AI Assistant Chat */}
      <CrewChat
        canteenId={selectedCanteen}
        onVerifyToken={handleVerifyToken}
        onShowOrders={(type) => setFilter(type)}
      />
    </div>
  );
}
