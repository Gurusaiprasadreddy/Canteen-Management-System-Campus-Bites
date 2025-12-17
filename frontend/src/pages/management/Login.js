import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { setAuth } from '@/utils/auth';
import { toast } from 'sonner';

export default function ManagementLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/management/login', formData);
      setAuth(response.data.token, response.data.user);
      toast.success('Login successful!');
      navigate('/management/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/management/dashboard';
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <Utensils className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold text-white">Campus Bites</span>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">Management Portal</h1>
            <p className="text-gray-300">Sign in to access analytics</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-white font-medium">Email</Label>
              <Input id="email" type="email" placeholder="manager@amrita.edu" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-2 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-gray-400" required data-testid="login-email-input" />
            </div>

            <div>
              <Label htmlFor="password" className="text-white font-medium">Password</Label>
              <Input id="password" type="password" placeholder="Enter password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-2 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-gray-400" required data-testid="login-password-input" />
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-xl py-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg" data-testid="login-submit-btn">
              {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Logging in...</>) : ('Login')}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-400">Or</span>
              </div>
            </div>

            <Button onClick={handleGoogleLogin} variant="outline" className="w-full mt-4 rounded-xl py-6 border-white/20 text-white hover:bg-white/10" data-testid="google-login-btn">
              <LogIn className="w-5 h-5 mr-2" />
              Sign in with Google
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-white/20 text-center">
            <Link to="/" className="text-sm text-gray-300 hover:text-white" data-testid="back-home-link">Back to Home</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
