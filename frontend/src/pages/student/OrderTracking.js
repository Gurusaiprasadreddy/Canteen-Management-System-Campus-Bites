import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Loader2, ArrowLeft, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { getSocket, joinRoom, leaveRoom } from '@/utils/socket';
import { toast } from 'sonner';

export default function OrderTracking() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/student/login');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my');
      const activeOrders = response.data.filter(
        (order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED'
      );
      setOrders(activeOrders);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'bg-yellow-500';
      case 'PREPARING':
        return 'bg-blue-500';
      case 'READY':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <Clock className="w-6 h-6" />;
      case 'PREPARING':
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case 'READY':
        return <CheckCircle className="w-6 h-6" />;
      default:
        return <Clock className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No active orders</h2>
          <p className="text-gray-600 mb-6">Your completed orders will appear here</p>
          <Button onClick={() => navigate('/student/dashboard')} className="rounded-full" data-testid="back-to-dashboard-btn">
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/student/dashboard')} data-testid="back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <span className="text-xl font-bold gradient-text">Order Tracking</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {orders.map((order, index) => (
            <motion.div
              key={order.order_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100"
              data-testid={`order-${order.order_id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1">Order #{order.token_number}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge className={`${getStatusColor(order.status)} text-white`}>
                  {order.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-6 p-4 bg-orange-50 rounded-xl">
                <div className={`${getStatusColor(order.status)} text-white p-3 rounded-full`}>
                  {getStatusIcon(order.status)}
                </div>
                <div>
                  <p className="font-bold text-lg">Token Number</p>
                  <p className="text-3xl font-mono font-bold text-orange-600">{order.token_number}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold mb-2">Items:</p>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.item_name} x{item.quantity}</span>
                    <span className="text-gray-600">₹{(item.price_at_order * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-orange-600">₹{order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
