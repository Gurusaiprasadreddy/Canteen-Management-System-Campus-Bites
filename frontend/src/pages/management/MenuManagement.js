import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, Plus, Edit, Trash2, ArrowLeft, Loader2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import api from '@/utils/api';
import { getAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function MenuManagement() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCanteen, setSelectedCanteen] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    canteen_id: 'sopanam',
    price: '',
    calories: '',
    carbs: '',
    protein: '',
    fat: '',
    fiber: '',
    vitamins: '',
    sodium: '',
    ingredients: '',
    allergens: '',
    stock_qty: '100',
    category: 'Main Course',
    image_url: '',
    veg_type: 'veg',
    prep_time: '10'
  });

  useEffect(() => {
    if (!user || user.role !== 'management') {
      navigate('/management/login');
      return;
    }
    fetchData();
  }, [user?.user_id, navigate]);

  const fetchData = async () => {
    try {
      const [canteensRes, itemsRes] = await Promise.all([
        api.get('/canteens'),
        api.get('/menu/sopanam')
      ]);
      setCanteens(canteensRes.data);

      // Fetch all canteen menus
      const allItems = [];
      for (const canteen of canteensRes.data) {
        const menuRes = await api.get(`/menu/${canteen.canteen_id}`);
        allItems.push(...menuRes.data);
      }
      setMenuItems(allItems);
    } catch (error) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        canteen_id: formData.canteen_id,
        price: parseFloat(formData.price),
        nutrition: {
          calories: parseInt(formData.calories),
          carbs: parseFloat(formData.carbs),
          protein: parseFloat(formData.protein),
          fat: parseFloat(formData.fat),
          fiber: parseFloat(formData.fiber),
          vitamins: formData.vitamins,
          sodium: parseFloat(formData.sodium)
        },
        ingredients: formData.ingredients,
        allergens: formData.allergens,
        stock_qty: parseInt(formData.stock_qty),
        category: formData.category,
        image_url: formData.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        veg_type: formData.veg_type,
        prep_time: parseInt(formData.prep_time)
      };

      await api.post('/menu', payload);
      toast.success('Menu item added successfully!');
      setShowAddModal(false);
      fetchData();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      canteen_id: 'sopanam',
      price: '',
      calories: '',
      carbs: '',
      protein: '',
      fat: '',
      fiber: '',
      vitamins: '',
      sodium: '',
      ingredients: '',
      allergens: '',
      stock_qty: '100',
      category: 'Main Course',
      image_url: '',
      veg_type: 'veg',
      prep_time: '10'
    });
  };

  const handleUpdateStock = async (itemId, newStock) => {
    try {
      await api.patch(`/menu/${itemId}`, { stock_qty: parseInt(newStock) });
      toast.success('Stock updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update stock');
    }
  };

  const handleToggleAvailability = async (itemId, available) => {
    try {
      await api.patch(`/menu/${itemId}`, { available: !available });
      toast.success(available ? 'Item disabled' : 'Item enabled');
      fetchData();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  let filteredItems = selectedCanteen === 'all'
    ? menuItems
    : menuItems.filter(item => item.canteen_id === selectedCanteen);

  if (selectedCategory !== 'all') {
    filteredItems = filteredItems.filter(item => item.category === selectedCategory);
  }

  const categories = ['all', ...new Set(menuItems.map(item => item.category))];

  if (loading && !showAddModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading menu...</p>
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/management/dashboard')} className="text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Utensils className="w-6 h-6 text-orange-500" />
              <span className="text-xl font-bold">Menu Management</span>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="bg-orange-500 hover:bg-orange-600" data-testid="add-item-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white mb-2 block">Filter by Canteen</Label>
            <select
              value={selectedCanteen}
              onChange={(e) => setSelectedCanteen(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-white"
              data-testid="canteen-filter"
            >
              <option value="all">All Canteens</option>
              {canteens.map(canteen => (
                <option key={canteen.canteen_id} value={canteen.canteen_id}>{canteen.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-white mb-2 block">Filter by Category</Label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-white"
              data-testid="category-filter"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.item_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-dark rounded-2xl p-6 border border-gray-700 hover:border-orange-500/50 transition-colors"
              data-testid={`menu-item-${item.item_id}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold">{item.name}</h3>
                  <Badge variant={item.veg_type === 'veg' ? 'secondary' : 'destructive'} className="text-xs mt-1">
                    {item.veg_type}
                  </Badge>
                </div>
                <p className="text-xl font-bold text-orange-500">₹{item.price}</p>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-400">Category: {item.category}</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">Stock: {item.stock_qty}</p>
                  {item.stock_qty < 20 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Low Stock
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-400">Calories: {item.nutrition?.calories || 0} kcal</p>
              </div>

              {/* Stock Controls */}
              <div className="flex gap-2 mb-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStock(item.item_id, Math.max(0, item.stock_qty - 10))}
                  className="flex-1 text-xs"
                >
                  <TrendingDown className="w-3 h-3 mr-1" />
                  -10
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStock(item.item_id, item.stock_qty + 10)}
                  className="flex-1 text-xs"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +10
                </Button>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                <span className="text-sm font-medium">
                  {item.available ? '🟢 Available' : '🔴 Out of Stock'}
                </span>
                <Switch
                  checked={item.available}
                  onCheckedChange={() => handleToggleAvailability(item.item_id, item.available)}
                  data-testid={`toggle-availability-${item.item_id}`}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No menu items found</p>
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-3xl p-8 max-w-2xl w-full my-8"
          >
            <h2 className="text-2xl font-bold mb-6">Add New Menu Item</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Item Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>

                <div>
                  <Label htmlFor="canteen">Canteen</Label>
                  <select id="canteen" value={formData.canteen_id} onChange={(e) => setFormData({ ...formData, canteen_id: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white border-gray-600">
                    {canteens.map(c => (
                      <option key={c.canteen_id} value={c.canteen_id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>

                <div>
                  <Label htmlFor="veg_type">Type</Label>
                  <select id="veg_type" value={formData.veg_type} onChange={(e) => setFormData({ ...formData, veg_type: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white border-gray-600">
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="stock_qty">Stock Quantity</Label>
                  <Input id="stock_qty" type="number" value={formData.stock_qty} onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>

                <div>
                  <Label htmlFor="calories">Calories</Label>
                  <Input id="calories" type="number" value={formData.calories} onChange={(e) => setFormData({ ...formData, calories: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>

                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input id="protein" type="number" step="0.1" value={formData.protein} onChange={(e) => setFormData({ ...formData, protein: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>

                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input id="carbs" type="number" step="0.1" value={formData.carbs} onChange={(e) => setFormData({ ...formData, carbs: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>

                <div>
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input id="fat" type="number" step="0.1" value={formData.fat} onChange={(e) => setFormData({ ...formData, fat: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>

                <div>
                  <Label htmlFor="fiber">Fiber (g)</Label>
                  <Input id="fiber" type="number" step="0.1" value={formData.fiber} onChange={(e) => setFormData({ ...formData, fiber: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>

                <div>
                  <Label htmlFor="sodium">Sodium (mg)</Label>
                  <Input id="sodium" type="number" step="0.1" value={formData.sodium} onChange={(e) => setFormData({ ...formData, sodium: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
                </div>
              </div>

              <div>
                <Label htmlFor="ingredients">Ingredients</Label>
                <Input id="ingredients" value={formData.ingredients} onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })} required className="bg-gray-700 text-white border-gray-600" />
              </div>

              <div>
                <Label htmlFor="allergens">Allergens</Label>
                <Input id="allergens" value={formData.allergens} onChange={(e) => setFormData({ ...formData, allergens: e.target.value })} placeholder="e.g., Dairy, Gluten" className="bg-gray-700 text-white border-gray-600" />
              </div>

              <div className="flex gap-4 mt-6">
                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : 'Add Item'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
