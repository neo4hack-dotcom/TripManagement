import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import RequestForm from './components/RequestForm';
import Dashboard from './components/Dashboard';
import BudgetPilot from './components/BudgetPilot';
import AdminPanel from './components/AdminPanel';
import LoginPage from './components/LoginPage';
import { Plane, LayoutDashboard, PieChart, LogOut, User as UserIcon, Settings, Shield } from 'lucide-react';

const MainLayout = () => {
  const { currentUser, logout } = useAppContext();
  const [activeTab, setActiveTab] = useState<'request' | 'dashboard' | 'budget' | 'admin'>('request');

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Plane className="text-blue-600" />
            TripFlow
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('request')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'request' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Plane size={18} />
            Nouvelle Demande
          </button>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={18} />
            Tableau de Bord
          </button>

          {(currentUser.role === 'finance' || currentUser.role === 'director') && (
            <button
              onClick={() => setActiveTab('budget')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'budget' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PieChart size={18} />
              Pilotage Budget
            </button>
          )}

          {currentUser.email === 'MM2026' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'admin' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Shield size={18} />
              Administration
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 text-sm text-slate-600 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'request' && <RequestForm />}
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'budget' && <BudgetPilot />}
          {activeTab === 'admin' && <AdminPanel />}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
