import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LaunchpadPage } from './pages/LaunchpadPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { ReferralPage } from './pages/ReferralPage';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { DMSPage } from './pages/DMSPage';
import './App.css';

function App() {
  return (
    <div className="app-layout">
      <Navbar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/launchpad" replace />} />
          <Route path="/launchpad" element={<LaunchpadPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/referrals" element={<ReferralPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/dms" element={<DMSPage />} />
          <Route path="*" element={<Navigate to="/launchpad" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
