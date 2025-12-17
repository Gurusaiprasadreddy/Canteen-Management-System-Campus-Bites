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

export default function StudentRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    roll_number: '',
    name: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (!/^CB\.[A-Z]{2,4}\.U4[A-Z]{3}\d{5}$/.test(formData.roll_number)) {
      toast.error('Invalid roll number format. Example: CB.SC.U4CSE23134');
      return;
    }

    setLoading(true);

    try {
      const { confirm_password, ...registerData } = formData;
      const response = await api.post('/auth/student/register', registerData);
      setAuth(response.data.token, response.data.user);
      toast.success('Registration successful!');
      navigate('/student/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-orange-100 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <Utensils className="w-8 h-8 text-orange-600" />
              <span className="text-2xl font-bold gradient-text">Campus Bites</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Register</h1>
            <p className="text-gray-600">Create your account to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="roll_number" className="text-gray-700 font-medium">Roll Number</Label>
              <Input
                id="roll_number"
                type="text"
                placeholder="CB.SC.U4CSE23134"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                className="mt-2 rounded-xl border-gray-200 focus:border-orange-500"
                required
                data-testid="register-roll-number-input"
              />
            </div>

            <div>
              <Label htmlFor="name" className="text-gray-700 font-medium">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2 rounded-xl border-gray-200 focus:border-orange-500"
                required
                data-testid="register-name-input"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-700 font-medium">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2 rounded-xl border-gray-200 focus:border-orange-500"
                data-testid="register-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-2 rounded-xl border-gray-200 focus:border-orange-500"
                required
                data-testid="register-password-input"
              />
            </div>

            <div>
              <Label htmlFor="confirm_password" className="text-gray-700 font-medium">Confirm Password</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="••••••••"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                className="mt-2 rounded-xl border-gray-200 focus:border-orange-500"
                required
                data-testid="register-confirm-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 btn-ripple"
              data-testid="register-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/student/login" className="text-orange-600 font-medium hover:text-orange-700" data-testid="login-link">
                Login here
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700" data-testid="back-home-link">
              ← Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
