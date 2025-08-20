import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import BookingCalendar from './components/BookingCalendar';
import Login from './components/Login';
import PazienteRegistrationForm from './components/PazienteRegistrationForm'; // <-- Importa il nuovo componente
import MedicoDashboard from './components/MedicoDashboard';
import PazienteDashboard from './components/PazienteDashboard';
import CreateDisponibilitaForm from './components/CreateDisponibilitaForm';
import FeedbackForm from './components/FeedbackForm';
import HomePage from './pages/HomePage';

// Componente helper per proteggere le rotte
type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: string[];
};

type MyJwtPayload = {
  role: string;
  // aggiungi altre proprietà se necessario
};

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const token = localStorage.getItem('jwtToken');

  if (!token) {
    // Se non c'è token, reindirizza al login
    return <Navigate to="/login" />;
  }

  const decodedToken = jwtDecode<MyJwtPayload>(token);
  // Nota: Spring Security usa 'ROLE_PAZIENTE' o 'ROLE_MEDICO'
  const userRole = `ROLE_${decodedToken.role}`; 

  if (!allowedRoles.includes(userRole)) {
    // Se il ruolo non è permesso, reindirizza alla home o a una pagina di errore
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotta pubblica per il calendario delle prenotazioni */}
        <Route path="/book" element={<BookingCalendar />} />
        {/* Rotta pubblica per la home page */}
        <Route path="/" element={<HomePage />} />

        {/* Rotta pubblica per il login */}
        <Route path="/login" element={<Login />} />

        {/* Rotta pubblica per la registrazione del paziente */}
        <Route path="/register" element={<PazienteRegistrationForm />} />

        {/* Rotta protetta per il Medico */}
        <Route 
          path="/medico-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['ROLE_MEDICO']}>
              <MedicoDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Rotta protetta per il form di creazione disponibilità del medico */}
        <Route 
          path="/medico/create-disponibilita" 
          element={
            <ProtectedRoute allowedRoles={['ROLE_MEDICO']}>
              <CreateDisponibilitaForm />
            </ProtectedRoute>
          } 
        />

        {/* Rotta protetta per il Paziente */}
        <Route 
          path="/paziente-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['ROLE_PAZIENTE']}>
              <PazienteDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Rotta catch-all per reindirizzare gli URL non corrispondenti al calendario */}
        <Route path="*" element={<Navigate to="/book" />} />
        <Route path="/feedback/:appuntamentoId" element={<FeedbackForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
