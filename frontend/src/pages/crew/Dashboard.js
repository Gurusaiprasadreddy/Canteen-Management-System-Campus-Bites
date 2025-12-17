import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, CheckCircle, Clock, LogOut, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/api';
import { getAuth, clearAuth } from '@/utils/auth';
import { getSocket, joinRoom, leaveRoom } from '@/utils/socket';
import { toast } from 'sonner';

export default function CrewDashboard() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'crew') {
      navigate('/crew/login');
      return;
    }
    fetchOrders();

    const canteenId = user.canteen_id || 'sopanam';
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
        toast.success(`New order received: #${data.order_id.slice(-6)}`);
        fetchOrders();
      }
    });

    return () => {
      leaveRoom(canteenId);
      socket.off('order_update');
    };
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const canteenId = user.canteen_id || 'sopanam';
      const response = await api.get(`/orders/pending/${canteenId}`);
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order updated to ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    navigate('/crew/login');
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
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Utensils className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-blue-600">Crew Dashboard</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome, {user?.name}!</h1>
          <p className="text-gray-600">Manage orders for your canteen</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No pending orders</h2>
            <p className="text-gray-600">New orders will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order, index) => (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl p-6 shadow-lg border border-blue-100"
                data-testid={`order-${order.order_id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-mono font-bold text-blue-600">#{order.token_number}</h3>
                    <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleTimeString()}</p>
                  </div>
                  <Badge className="bg-blue-500 text-white">{order.status}</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.item_name} x{item.quantity}</span>
                      <span className="text-gray-600">₹{item.price_at_order * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
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
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
