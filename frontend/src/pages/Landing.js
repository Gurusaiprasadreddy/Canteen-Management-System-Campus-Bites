import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Utensils, Sparkles, TrendingUp, Clock, Shield, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const features = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "AI-Powered Recommendations",
      description: "Get personalized meal suggestions based on your health goals and order history"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Skip the Queue",
      description: "Order ahead and pick up your food with a unique token number"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Track Your Spending",
      description: "Monitor your daily, weekly, and monthly food expenses with smart analytics"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure Payments",
      description: "Pay safely with Razorpay - UPI, Cards, Net Banking supported"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Mobile-First Design",
      description: "Seamless experience on all devices with beautiful, modern UI"
    },
    {
      icon: <Utensils className="w-8 h-8" />,
      title: "3 Campus Canteens",
      description: "Access Sopanam, MBA, and Samudra canteens all in one place"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Utensils className="w-8 h-8 text-orange-600" />
              <span className="text-2xl font-bold gradient-text">Campus Bites</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild className="rounded-full border-orange-200 hover:border-orange-400">
                <Link to="/crew/login">Crew Login</Link>
              </Button>
              <Button asChild className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20">
                <Link to="/student/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Smart Ordering</span>
            </motion.div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
              <span className="gradient-text">Skip the Queue,</span>
              <br />
              <span className="text-gray-900">Savor the Moment</span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Order from Sopanam, MBA, and Samudra canteens with AI recommendations, instant payments, and real-time tracking.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" asChild className="rounded-full px-8 py-6 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-2xl shadow-orange-500/30 btn-ripple" data-testid="hero-order-now-btn">
                <Link to="/student/register">Order Now →</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-8 py-6 text-lg border-2 border-orange-300 hover:border-orange-500 hover:bg-orange-50" data-testid="hero-management-login-btn">
                <Link to="/management/login">Management Login</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="mt-16 relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
              <img src="https://images.unsplash.com/photo-1663086195364-fd8eca0f2c78?w=1200" alt="Delicious South Indian food" className="w-full h-[400px] object-cover" />
            </div>
          </motion.div>
        </div>

        <div className="absolute top-20 left-10 w-20 h-20 bg-orange-200 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-amber-200 rounded-full blur-3xl opacity-50"></div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">Why Choose Campus Bites?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Experience the future of campus dining</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }} className="bg-gradient-to-br from-white to-orange-50 p-8 rounded-3xl border border-orange-100 shadow-lg hover:shadow-2xl card-hover" data-testid={`feature-card-${index}`}>
                <div className="text-orange-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">&copy; 2025 Campus Bites. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
