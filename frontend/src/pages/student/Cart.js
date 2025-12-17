import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { getCart, updateCartItemQuantity, removeFromCart, clearCart, getCartTotal } from '@/utils/cart';
import { toast } from 'sonner';
import SuccessCelebration from '@/components/SuccessCelebration';
import EmptyState from '@/components/EmptyState';

export default function Cart() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderToken, setOrderToken] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/student/login');
      return;
    }
    setCart(getCart());
  }, [user, navigate]);

  const handleUpdateQuantity = (itemId, newQuantity) => {
    const updatedCart = updateCartItemQuantity(itemId, newQuantity);
    setCart(updatedCart);
  };

  const handleRemoveItem = (itemId) => {
    const updatedCart = removeFromCart(itemId);
    setCart(updatedCart);
    toast.success('Item removed from cart');
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const canteenId = cart[0].canteen_id;
    const total = getCartTotal();

    setLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        setLoading(false);
        return;
      }

      const orderItems = cart.map(item => ({
        item_id: item.item_id,
        item_name: item.name,
        quantity: item.quantity,
        price_at_order: item.price
      }));

      const orderResponse = await api.post('/orders', {
        items: orderItems,
        canteen_id: canteenId,
        total_amount: total
      });

      const { razorpay_order_id, razorpay_key_id, token_number, order_id, test_mode } = orderResponse.data;

      // If test mode, simulate payment immediately
      if (test_mode) {
        try {
          await api.post(`/orders/${order_id}/verify-payment`, {
            payment_id: 'pay_test_' + Date.now(),
            signature: 'test_signature'
          });

          clearCart();
          setCart([]);
          setOrderToken(token_number);
          setShowSuccess(true);
        } catch (error) {
          toast.error('Order creation failed');
        }
      } else {
        // Real Razorpay mode
        const options = {
          key: razorpay_key_id,
          amount: total * 100,
          currency: 'INR',
          name: 'Campus Bites',
          description: `Order for ${cart.length} items`,
          order_id: razorpay_order_id,
          handler: async function (response) {
            try {
              await api.post(`/orders/${order_id}/verify-payment`, {
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature
              });

              clearCart();
              setCart([]);
              setOrderToken(token_number);
              setShowSuccess(true);
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
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const total = getCartTotal();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        <EmptyState
          type="cart"
          onAction={() => navigate('/student/dashboard')}
          actionText="Browse Menu"
          actionTestId="back-to-menu-btn"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <SuccessCelebration
        show={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          navigate('/student/orders/tracking');
        }}
        title="Order Placed Successfully!"
        message="Show your token number at the counter"
        tokenNumber={orderToken}
      />

      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <span className="text-xl font-bold gradient-text">Your Cart</span>
            </div>
            <span className="text-gray-600">{cart.length} items</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {cart.map((item) => (
            <motion.div
              key={item.item_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-orange-100"
              data-testid={`cart-item-${item.item_id}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.nutrition.calories} kcal</p>
                  <p className="text-orange-600 font-bold mt-1">₹{item.price}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateQuantity(item.item_id, item.quantity - 1)}
                    className="rounded-full w-8 h-8 p-0"
                    data-testid={`decrease-qty-${item.item_id}`}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>

                  <span className="text-lg font-bold w-8 text-center" data-testid={`qty-${item.item_id}`}>
                    {item.quantity}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateQuantity(item.item_id, item.quantity + 1)}
                    className="rounded-full w-8 h-8 p-0"
                    data-testid={`increase-qty-${item.item_id}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.item_id)}
                    className="text-red-500 hover:text-red-700"
                    data-testid={`remove-${item.item_id}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-orange-100">
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (0%)</span>
              <span>₹0.00</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-orange-600">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full mt-6 py-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg"
            data-testid="checkout-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
