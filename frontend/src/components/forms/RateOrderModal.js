import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/utils/api';

export default function RateOrderModal({ order, isOpen, onClose, onSuccess }) {
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [itemRatings, setItemRatings] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize item ratings to 0
  if (!isOpen) return null;

  const handleItemRatingChange = (itemId, rating) => {
    setItemRatings(prev => ({
      ...prev,
      [itemId]: rating
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (deliveryRating === 0) {
      toast.error("Please rate the delivery time");
      return;
    }
    
    const missingRatings = order.items.filter(item => !itemRatings[item.item_id]);
    if (missingRatings.length > 0) {
      toast.error("Please rate all items in your order");
      return;
    }

    setSubmitting(true);
    
    try {
      const payload = {
        delivery_time_rating: deliveryRating,
        items: Object.entries(itemRatings).map(([item_id, rating]) => ({
          item_id,
          rating
        }))
      };

      await api.post(`/orders/${order.order_id}/rate`, payload);
      toast.success("Thank you for your feedback!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, size = "md" }) => {
    return (
      <div className="flex gap-1 cursor-pointer">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            onClick={() => onChange(star)}
            className={`
              ${size === "md" ? "w-6 h-6" : "w-8 h-8"}
              transition-colors
              ${star <= value ? "fill-orange-500 text-orange-500" : "text-gray-300"}
              hover:fill-orange-400 hover:text-orange-400
            `}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-orange-50 to-white">
          <h2 className="text-xl font-bold">Rate Your Order</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-orange-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          {/* Delivery Rating */}
          <div className="text-center space-y-3">
            <h3 className="font-semibold text-gray-700">How was the delivery time?</h3>
            <div className="flex justify-center">
              <StarRating 
                value={deliveryRating} 
                onChange={setDeliveryRating} 
                size="lg" 
              />
            </div>
          </div>

          <div className="border-t border-gray-100 my-4"></div>

          {/* Item Ratings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 mb-2">Rate your food items</h3>
            {order.items.map((item) => (
              <div key={item.item_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="font-medium text-sm flex-1 truncate pr-2">{item.item_name}</span>
                <StarRating 
                  value={itemRatings[item.item_id] || 0} 
                  onChange={(rating) => handleItemRatingChange(item.item_id, rating)} 
                  size="md"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <Button 
            className="w-full rounded-full bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
