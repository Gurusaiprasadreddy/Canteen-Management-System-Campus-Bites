import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Sparkles, TrendingUp, Clock, Shield, Smartphone, X, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const [showDevelopers, setShowDevelopers] = useState(false);

  const developers = [
    { name: "N. Surya Tejeswar", image: "http://localhost:8001/static/Team Members/Surya.jpg", link: "https://surya-8143.github.io/Portfolio/" },
    { name: "P.M Radha Krishna", image: "http://localhost:8001/static/Team Members/Radha Krishna.jpg" },
    { name: "B. Guru Sai Prasad", image: "http://localhost:8001/static/Team Members/Guru.jpg" }
  ];
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
              <Button variant="ghost" onClick={() => setShowDevelopers(true)} className="rounded-full text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-medium hidden sm:flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                Developers
              </Button>
              <Button asChild className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20">
                <Link to="/login?tab=student">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Developers Modal */}
      <AnimatePresence>
        {showDevelopers && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-10 w-full max-w-4xl shadow-2xl relative"
            >
              <button
                onClick={() => setShowDevelopers(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>

              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Meet The Developers</h2>
                <div className="h-1 w-20 bg-orange-500 mx-auto rounded-full"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {developers.map((dev, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx}
                    className="flex flex-col items-center text-center group"
                  >
                    <div className="relative mb-6">
                      {dev.link ? (
                        <a href={dev.link} target="_blank" rel="noopener noreferrer" className="block relative cursor-pointer">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full blur-xl opacity-0 hover:opacity-40 transition-opacity duration-300"></div>
                          <img
                            src={dev.image}
                            alt={dev.name}
                            className="w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover border-4 border-white shadow-xl relative z-10 transition-transform duration-300 hover:scale-105"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${dev.name.replace(' ', '+')}&background=FFDBBB&color=EA580C&size=200`;
                            }}
                          />
                        </a>
                      ) : (
                        <div className="block relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
                          <img
                            src={dev.image}
                            alt={dev.name}
                            className="w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover border-4 border-white shadow-xl relative z-10 transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${dev.name.replace(' ', '+')}&background=FFDBBB&color=EA580C&size=200`;
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">{dev.name}</h3>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <Link to="/login?tab=student">Order Now →</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="mt-16 relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
              <img src="https://images.pexels.com/photos/8818732/pexels-photo-8818732.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Delicious Indian thali meal" className="w-full h-[400px] object-cover" />
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
