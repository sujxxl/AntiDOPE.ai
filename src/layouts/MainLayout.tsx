import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

type MainLayoutProps = {
  onLogout: () => void;
  userEmail?: string;
};

export default function MainLayout({ onLogout, userEmail }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <div className="no-print">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col">
        <div className="no-print">
          <Header onLogout={onLogout} userEmail={userEmail} />
        </div>
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
