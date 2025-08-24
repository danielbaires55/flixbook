import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importa i tuoi componenti
import BookingCalendar from "./components/BookingCalendar";
import Login from "./components/Login";
import MedicoDashboard from "./components/MedicoDashboard";
import PazienteDashboard from "./components/PazienteDashboard";
import CreateDisponibilitaForm from "./components/CreateDisponibilitaForm";
import FeedbackForm from "./components/FeedbackForm";
import HomePage from "./pages/HomePage";
import { useAuth } from "./context/useAuth";
import { useLocation } from "react-router-dom";
import PazienteRegistrationForm from "./components/RegisterForm";

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
        <Route path="/book" element={<BookingCalendar />} />
        <Route path="/register" element={<PazienteRegistrationForm />} />

        {/* Rotte protette */}

        {/* Dashboard per Medico E Collaboratore */}
        <Route
          path="/medico-dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["ROLE_MEDICO", "ROLE_COLLABORATORE"]}
            >
              <MedicoDashboard />
            </ProtectedRoute>
          }
        />

        {/* Creazione disponibilità per Medico E Collaboratore */}
        <Route
          path="/medico/create-disponibilita"
          element={
            <ProtectedRoute
              allowedRoles={["ROLE_MEDICO", "ROLE_COLLABORATORE"]}
            >
              <CreateDisponibilitaForm />
            </ProtectedRoute>
          }
        />

        {/* Dashboard per il Paziente */}
        <Route
          path="/paziente-dashboard"
          element={
            <ProtectedRoute allowedRoles={["ROLE_PAZIENTE"]}>
              <PazienteDashboard />
            </ProtectedRoute>
          }
        />

        {/* Rotta catch-all per reindirizzare URL non validi */}
        <Route path="*" element={<Navigate to="/" />} />

        <Route
          path="/feedback/:appuntamentoId"
          element={
            <ProtectedRoute allowedRoles={["ROLE_PAZIENTE"]}>
              <FeedbackForm />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
