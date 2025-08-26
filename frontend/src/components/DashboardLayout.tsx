import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
// import Footer from './Footer'; // Se vuoi anche il footer

const DashboardLayout: React.FC = () => {
  return (
    <div>
      <NavBar />
      <main className="container my-4">
        {/* L'Outlet è un segnaposto dove React Router metterà
            il componente della pagina specifica (es. MedicoDashboard) */}
        <Outlet />
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default DashboardLayout;