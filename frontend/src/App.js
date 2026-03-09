import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

// Import pages
import Landing from "@/pages/Landing";
import SmartLogin from "@/pages/auth/SmartLogin";
import SmartSignup from "@/pages/auth/SmartSignup";
import MenuItemPage from "@/pages/forms/MenuItemPage";
import ProteinGoalPage from "@/pages/forms/ProteinGoalPage";
import OrderPage from "@/pages/forms/OrderPage";
import FormsIndex from "@/pages/forms/FormsIndex";
import StudentMasterPage from "@/pages/forms/StudentMasterPage";
import CanteenMasterPage from "@/pages/forms/CanteenMasterPage";
import WellnessQueryPage from "@/pages/forms/WellnessQueryPage";
import RecommendationLogPage from "@/pages/forms/RecommendationLogPage";
import RecommendationFeedbackPage from "@/pages/forms/RecommendationFeedbackPage";

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
          <Route path="/student/checkout" element={<OrderPage />} />
          <Route path="/student/orders/tracking" element={<OrderTracking />} />
          <Route path="/student/orders/history" element={<OrderHistory />} />
          <Route path="/student/spending" element={<SpendingAnalytics />} />
          <Route path="/student/ai-recommendations" element={<AIRecommendations />} />
          <Route path="/student/nutrition-goal" element={<ProteinGoalPage />} />

          {/* Crew Routes */}
          <Route path="/crew/dashboard" element={<CrewDashboard />} />

          {/* Management Routes */}
          <Route path="/management/dashboard" element={<ManagementDashboard />} />
          <Route path="/management/menu" element={<MenuManagement />} />
          <Route path="/management/menu/add" element={<MenuItemPage />} />

          {/* Assignment Forms */}
          <Route path="/forms" element={<FormsIndex />} />
          <Route path="/forms/menu-items" element={<MenuItemPage />} />
          <Route path="/forms/students" element={<StudentMasterPage />} />
          <Route path="/forms/canteens" element={<CanteenMasterPage />} />
          <Route path="/forms/orders" element={<OrderPage />} />
          <Route path="/forms/wellness-queries" element={<WellnessQueryPage />} />
          <Route path="/forms/recommendation-logs" element={<RecommendationLogPage />} />
          <Route path="/forms/recommendation-feedback" element={<RecommendationFeedbackPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" expand={true} richColors />
    </div>
  );
}

export default App;
