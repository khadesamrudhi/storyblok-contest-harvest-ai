import './App.css';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Competitors from './pages/Competitors';
import Assets from './pages/Assets';
import Trends from './pages/Trends';
import Insights from './pages/Insights';
import Integrations from './pages/Integrations';

function TopNav() {
  const linkBase = 'px-3 py-2 rounded-md text-sm font-medium';
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded bg-gradient-to-r from-blue-600 to-purple-600 mr-2" />
          <span className="font-bold text-lg">ContentHarvest</span>
        </div>
        <nav className="hidden sm:flex items-center space-x-1 text-sm">
          <NavLink className={({isActive}) => `${linkBase} ${isActive? 'bg-blue-50 text-blue-700' : 'hover:text-blue-600'}`} to="/dashboard">Dashboard</NavLink>
          <NavLink className={({isActive}) => `${linkBase} ${isActive? 'bg-blue-50 text-blue-700' : 'hover:text-blue-600'}`} to="/competitors">Competitors</NavLink>
          <NavLink className={({isActive}) => `${linkBase} ${isActive? 'bg-blue-50 text-blue-700' : 'hover:text-blue-600'}`} to="/assets">Assets</NavLink>
          <NavLink className={({isActive}) => `${linkBase} ${isActive? 'bg-blue-50 text-blue-700' : 'hover:text-blue-600'}`} to="/trends">Trends</NavLink>
          <NavLink className={({isActive}) => `${linkBase} ${isActive? 'bg-blue-50 text-blue-700' : 'hover:text-blue-600'}`} to="/insights">Insights</NavLink>
          <NavLink className={({isActive}) => `${linkBase} ${isActive? 'bg-blue-50 text-blue-700' : 'hover:text-blue-600'}`} to="/integrations">Integrations</NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-500">
        © {new Date().getFullYear()} ContentHarvest. All rights reserved.
      </div>
    </footer>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="*" element={<div className="text-sm text-gray-500">Page not found</div>} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
