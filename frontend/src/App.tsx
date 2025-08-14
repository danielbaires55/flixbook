import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import BookingCalendar from './components/BookingCalendar';
import Login from './components/Login';
import MedicoDashboard from './components/MedicoDashboard';
import PazienteDashboard from './components/PazienteDashboard';
import CreateDisponibilitaForm from './components/CreateDisponibilitaForm';

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
  const userRole = decodedToken.role;

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
        {/* Rotta pubblica per la home (calendario prenotazioni) */}
        <Route path="/book" element={<BookingCalendar />} />
        
        {/* Rotta pubblica per il login */}
        <Route path="/login" element={<Login />} />

        {/* Rotta protetta per il Medico */}
        <Route 
          path="/medico-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['MEDICO']}>
              <MedicoDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Rotta protetta per il form di creazione disponibilità del medico */}
        <Route 
          path="/medico/create-disponibilita" 
          element={
            <ProtectedRoute allowedRoles={['MEDICO']}>
              <CreateDisponibilitaForm />
            </ProtectedRoute>
          } 
        />

        {/* Rotta protetta per il Paziente */}
        <Route 
          path="/paziente-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['PAZIENTE']}>
              <PazienteDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Rotta catch-all per reindirizzare gli URL non corrispondenti al login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;