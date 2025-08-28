import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
// import Footer from './Footer'; // Se vuoi anche il footer

const DashboardLayout: FC = () => {
  return (
    <div>
      <NavBar />
      <main className="container my-4">
        <Outlet />
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default DashboardLayout;