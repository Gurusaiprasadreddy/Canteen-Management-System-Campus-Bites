import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

// Import pages
import Landing from "@/pages/Landing";
import SmartLogin from "@/pages/auth/SmartLogin";
import SmartSignup from "@/pages/auth/SmartSignup";

// Student
import StudentRegister from "@/pages/student/Register";
import StudentDashboard from "@/pages/student/Dashboard";
import CanteenView from "@/pages/student/CanteenView";
import Cart from "@/pages/student/Cart";
import OrderTracking from "@/pages/student/OrderTracking";
import OrderHistory from "@/pages/student/OrderHistory";
import SpendingAnalytics from "@/pages/student/SpendingAnalytics";
import AIRecommendations from "@/pages/student/AIRecommendations";

// Crew
import CrewSignup from "@/pages/crew/Signup";
import CrewDashboard from "@/pages/crew/Dashboard";

// Management
import ManagementSignup from "@/pages/management/Signup";
import ManagementDashboard from "@/pages/management/Dashboard";
import MenuManagement from "@/pages/management/MenuManagement";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Landing />} />

          {/* Master Auth Section */}
          <Route path="/login" element={<SmartLogin />} />
          <Route path="/signup" element={<SmartSignup />} />

          {/* Legacy Resets */}
          <Route path="/student/login" element={<Navigate to="/login?tab=student" replace />} />
          <Route path="/crew/login" element={<Navigate to="/login?tab=crew" replace />} />
          <Route path="/management/login" element={<Navigate to="/login?tab=management" replace />} />

          <Route path="/student/register" element={<Navigate to="/signup?tab=student" replace />} />
          <Route path="/crew/signup" element={<Navigate to="/signup?tab=crew" replace />} />
          <Route path="/management/signup" element={<Navigate to="/signup?tab=management" replace />} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/canteen/:canteenId" element={<CanteenView />} />
          <Route path="/student/cart" element={<Cart />} />
          <Route path="/student/orders/tracking" element={<OrderTracking />} />
          <Route path="/student/orders/history" element={<OrderHistory />} />
          <Route path="/student/spending" element={<SpendingAnalytics />} />
          <Route path="/student/ai-recommendations" element={<AIRecommendations />} />

          {/* Crew Routes */}
          <Route path="/crew/dashboard" element={<CrewDashboard />} />

          {/* Management Routes */}
          <Route path="/management/dashboard" element={<ManagementDashboard />} />
          <Route path="/management/menu" element={<MenuManagement />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" expand={true} richColors />
    </div>
  );
}

export default App;
