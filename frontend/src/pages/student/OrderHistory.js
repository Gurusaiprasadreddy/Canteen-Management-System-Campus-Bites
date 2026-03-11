import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ArrowLeft, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function OrderHistory() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Payment State
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/student/login');
      return;
    }
    fetchOrders();
    fetchPaymentConfig();
  }, [user?.user_id, navigate]);

  const fetchPaymentConfig = async () => {
    try {
      const res = await api.get('/config/payment');
      setPaymentConfig(res.data);
    } catch (error) {
      console.error("Failed to load payment config");
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async (order) => {
    if (!paymentConfig) {
      toast.error('Payment system unavailable');
      return;
    }

    setProcessingPayment(order.order_id);

    try {
      if (paymentConfig.test_mode) {
        // Test Mode Simulation
        await api.post(`/orders/${order.order_id}/verify-payment`, {
          payment_id: 'pay_retry_' + Date.now(),
          signature: 'test_signature_retry'
        });
        toast.success('Payment completed successfully!');
        fetchOrders();
      } else {
        // Real Razorpay
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error('Failed to load payment gateway');
          return;
        }

        const options = {
          key: paymentConfig.razorpay_key_id,
          amount: order.total_amount * 100,
          currency: 'INR',
          name: 'Campus Bites',
          description: `Order #${order.token_number}`,
          order_id: order.razorpay_order_id,
          handler: async function (response) {
            try {
              await api.post(`/orders/${order.order_id}/verify-payment`, {
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature
              });
              toast.success('Payment completed successfully!');
              fetchOrders();
            } catch (error) {
              toast.error('Payment verification failed');
            }
          },
          prefill: {
            name: user.name,
            email: user.email || '',
            contact: ''
          },
          theme: {
            color: '#f97316'
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      }
    } catch (error) {
      console.error(error);
      toast.error('Payment failed');
    } finally {
      setProcessingPayment(null);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my');
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
  };

  const toggleSelectOrder = (orderId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.order_id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    if (!window.confirm(`Delete ${selectedIds.size} selected orders?`)) return;

    try {
      await api.post('/orders/batch-delete', {
        order_ids: Array.from(selectedIds)
      });
      toast.success('Selected orders deleted');
      fetchOrders();
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Failed to delete orders');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL order history?')) return;

    try {
      await api.delete('/orders/my');
      toast.success('History cleared');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
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
              <span className="text-xl font-bold gradient-text">Order History</span>
            </div>

            <div className="flex gap-2">
              {isSelectionMode ? (
                <>
                  <Button variant="ghost" size="sm" onClick={toggleSelectionMode}>
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete ({selectedIds.size})
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                    <CheckSquare className="w-4 h-4 mr-2" /> Select
                  </Button>
                  {orders.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteAll}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Clear All
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">Start ordering to see your history here</p>
            <Button onClick={() => navigate('/student/dashboard')} className="rounded-full">
              Browse Menu
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isSelectionMode && (
              <div className="flex items-center gap-2 mb-4 px-2">
                <button onClick={selectAll} className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  {selectedIds.size === orders.length ? (
                    <CheckSquare className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  Select All
                </button>
              </div>
            )}

            <AnimatePresence>
              {orders.map((order, index) => (
                <motion.div
                  key={order.order_id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl p-6 shadow-lg border transition-colors cursor-pointer ${selectedIds.has(order.order_id) ? 'border-orange-500 bg-orange-50' : 'border-orange-100'
                    }`}
                  onClick={() => isSelectionMode && toggleSelectOrder(order.order_id)}
                  data-testid={`order-${order.order_id}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                      {isSelectionMode && (
                        <div className="mt-1">
                          {selectedIds.has(order.order_id) ? (
                            <CheckSquare className="w-5 h-5 text-orange-500 fill-orange-500 text-white" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold">Order #{order.token_number}</h3>
                        <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <Badge variant={order.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                  </div>

                  {order.status === 'PENDING_PAYMENT' && (
                    <div className="mb-4 pl-8">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayNow(order);
                        }}
                        disabled={processingPayment === order.order_id}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl"
                      >
                        {processingPayment === order.order_id ? (
                          <>Processing...</>
                        ) : (
                          <>Complete Payment</>
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2 pl-8">
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
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
