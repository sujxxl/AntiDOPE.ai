import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen">
      <div className="no-print">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col">
        <div className="no-print">
            <Header />
        </div>
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
