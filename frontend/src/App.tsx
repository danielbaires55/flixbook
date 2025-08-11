import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookingCalendar from './components/BookingCalendar';
import Login from './components/Login';
import MedicoDashboard from './components/MedicoDashboard';
import PazienteDashboard from './components/PazienteDashboard'; // Importa il nuovo componente

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BookingCalendar />} />
        <Route path="/login" element={<Login />} />
        <Route path="/medico-dashboard" element={<MedicoDashboard />} />
        <Route path="/paziente-dashboard" element={<PazienteDashboard />} /> {/* Aggiungi questa riga */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;