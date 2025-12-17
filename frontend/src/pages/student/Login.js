import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { setAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ roll_number: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/student/login', formData);
      setAuth(response.data.token, response.data.user);
      toast.success('Login successful!');
      navigate('/student/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl border border-orange-100 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <Utensils className="w-8 h-8 text-orange-600" />
              <span className="text-2xl font-bold gradient-text">Campus Bites</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Login</h1>
            <p className="text-gray-600">Enter your roll number to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="roll_number" className="text-gray-700 font-medium">Roll Number</Label>
              <Input id="roll_number" type="text" placeholder="CB.SC.U4CSE23134" value={formData.roll_number} onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })} className="mt-2 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500" required data-testid="login-roll-number-input" />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
              <Input id="password" type="password" placeholder="Enter password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-2 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500" required data-testid="login-password-input" />
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-xl py-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 btn-ripple" data-testid="login-submit-btn">
              {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Logging in...</>) : ('Login')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">Don't have an account? <Link to="/student/register" className="text-orange-600 font-medium hover:text-orange-700" data-testid="register-link">Register here</Link></p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700" data-testid="back-home-link">Back to Home</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
