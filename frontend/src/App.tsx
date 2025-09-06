import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Componenti
import BookingCalendar from "./components/BookingCalendar";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import MedicoDashboard from "./components/MedicoDashboard";
import PazienteDashboard from "./components/PazienteDashboard";
import FeedbackForm from "./components/FeedbackForm";
import HomePage from "./pages/HomePage";
import { useAuth } from "./context/useAuth";
import { useLocation } from "react-router-dom";
import PazienteRegistrationForm from "./components/RegisterForm";
import CreateBloccoOrarioForm from "./components/CreateBloccoOrarioForm";
import DashboardLayout from "./components/DashboardLayout";
import MedicoProfiloPage from "./pages/MedicoProfiloPage";
import PazienteProfiloPage from "./pages/PazienteProfilePage";
import RefertiPage from "./pages/RefertiPage";
import AdminMediciPage from "./pages/AdminMediciPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminSediPage from "./pages/AdminSediPage";
import AdminUtentiOpsPage from "./pages/AdminUtentiOpsPage";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: string[];
};

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotte pubbliche */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/book" element={<BookingCalendar />} />
        <Route path="/register" element={<PazienteRegistrationForm />} />

        {/* Rotte protette */}

        {/* Dashboard per Medico E Collaboratore */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={["ROLE_MEDICO", "ROLE_COLLABORATORE", "ROLE_ADMIN"]}
            >
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Queste rotte sono ora "figlie" del layout.
        Verranno visualizzate DENTRO il DashboardLayout,
        dove si trova il tag <Outlet />.
      */}
          <Route path="/medico-dashboard" element={<MedicoDashboard />} />
          <Route
            path="/medico/create-blocco-orario"
            element={<CreateBloccoOrarioForm />}
          />
          <Route path="/medico/profilo" element={<MedicoProfiloPage />} />
          {/* Admin */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/medici" element={<AdminMediciPage />} />
          <Route path="/admin/sedi" element={<AdminSediPage />} />
          <Route path="/admin/ops" element={<AdminUtentiOpsPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute allowedRoles={["ROLE_PAZIENTE"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Queste sono ora le pagine "figlie" del layout del paziente */}
          <Route path="/paziente-dashboard" element={<PazienteDashboard />} />
          <Route path="/paziente/referti" element={<RefertiPage />} />
          <Route path="/feedback/:appuntamentoId" element={<FeedbackForm />} />

          {/* AGGIUNGI LA NUOVA ROTTA QUI */}
          <Route path="/paziente/profilo" element={<PazienteProfiloPage />} />
        </Route>
        {/* Rotta catch-all per reindirizzare URL non validi */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
