/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage.tsx';
import GalleryPage from './pages/GalleryPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';

function HeaderAdminControl() {
  const { isAuthenticated, email, logout } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-4 text-[10px] md:text-xs border-l border-linen pl-6 hidden md:flex">
        <span className="text-sage font-medium">{email}</span>
        <button onClick={() => { logout(); navigate('/'); }} className="text-stone hover:text-red-400 font-semibold uppercase tracking-wider transition-colors">Logout</button>
      </div>
    );
  }

  return (
    <div className="flex items-center text-[10px] md:text-xs border-l border-linen pl-6 hidden md:flex">
      <Link to="/login" className="text-stone hover:text-sage font-semibold uppercase tracking-wider transition-colors">User Login</Link>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-natural-bg text-clay font-sans p-6 md:p-10 flex flex-col gap-8">
      {/* Header */}
      <header className="border-b border-linen pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-normal text-clay">
            <Link to="/" className="hover:text-sage transition-colors">Purr-Real</Link>
          </h1>
          <p className="text-stone font-serif italic text-sm mt-1">A curated database of feline companions</p>
        </div>
        
        <nav className="flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-xs md:text-sm font-semibold uppercase tracking-widest transition-all ${
              location.pathname === '/' ? 'text-sage border-b-2 border-sage pb-1' : 'text-stone hover:text-clay'
            }`}
          >
            Overview
          </Link>
          <Link 
            to="/gallery" 
            className={`text-xs md:text-sm font-semibold uppercase tracking-widest transition-all ${
              location.pathname === '/gallery' ? 'text-sage border-b-2 border-sage pb-1' : 'text-stone hover:text-clay'
            }`}
          >
            Archive
          </Link>
          <HeaderAdminControl />
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="mt-auto pt-10 border-t border-linen text-center text-[10px] text-stone uppercase tracking-widest font-semibold flex flex-col md:flex-row justify-between gap-4">
        <span>Purr-Real v0.6.0</span>
        <div className="flex gap-4 justify-center">
          <Link to="/" className="hover:text-sage transition-colors">Overview</Link>
          <Link to="/gallery" className="hover:text-sage transition-colors">Archive</Link>
          <Link to="/login" className="hover:text-sage transition-colors">User Login</Link>
        </div>
        <span className="italic uppercase">Documenting the extraordinary nature of companions</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}



