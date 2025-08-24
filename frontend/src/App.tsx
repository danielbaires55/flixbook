import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importa i tuoi componenti
import BookingCalendar from './components/BookingCalendar';
import Login from './components/Login';
import MedicoDashboard from './components/MedicoDashboard';
import PazienteDashboard from './components/PazienteDashboard';
import CreateDisponibilitaForm from './components/CreateDisponibilitaForm';
import FeedbackForm from './components/FeedbackForm';
import HomePage from './pages/HomePage';
import { useAuth } from './context/useAuth'; // Assicurati che il percorso sia corretto


// ====================================================================================
// VERSIONE CORRETTA E PULITA DI PROTECTEDROUTE
// ====================================================================================
type ProtectedRouteProps = {
    children: React.ReactNode;
    allowedRoles: string[];
};

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    // 1. Prende l'utente dal Context, che si aggiorna in tempo reale
    const { user } = useAuth();
   console.log("ProtectedRoute sta controllando l'utente:", user);
    // 2. Se non c'è un utente nello stato, reindirizza al login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Se il ruolo dell'utente non è tra quelli permessi, reindirizza alla home
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // 4. Se i controlli passano, mostra il componente richiesto
    return children;
};
// ====================================================================================


function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Rotte pubbliche */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/book" element={<BookingCalendar />} />
                <Route path="/feedback/:appuntamentoId" element={<FeedbackForm />} />
                
                {/* Rotte protette */}

                {/* Dashboard per Medico E Collaboratore */}
                <Route 
                    path="/medico-dashboard" 
                    element={
                        <ProtectedRoute allowedRoles={['ROLE_MEDICO', 'ROLE_COLLABORATORE']}>
                            <MedicoDashboard />
                        </ProtectedRoute>
                    } 
                />
                
                {/* Creazione disponibilità per Medico E Collaboratore */}
                <Route 
                    path="/medico/create-disponibilita" 
                    element={
                        <ProtectedRoute allowedRoles={['ROLE_MEDICO', 'ROLE_COLLABORATORE']}>
                            <CreateDisponibilitaForm />
                        </ProtectedRoute>
                    } 
                />

                {/* Dashboard per il Paziente */}
                <Route 
                    path="/paziente-dashboard" 
                    element={
                        <ProtectedRoute allowedRoles={['ROLE_PAZIENTE']}>
                            <PazienteDashboard />
                        </ProtectedRoute>
                    } 
                />

                {/* Rotta catch-all per reindirizzare URL non validi */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;