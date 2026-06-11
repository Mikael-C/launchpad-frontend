import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Rocket, 
  TrendingUp, 
  Users, 
  Wallet, 
  ShieldAlert, 
  Cpu 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🚀</div>
        <div className="sidebar-logo-text">Launch<span>Pad</span></div>
      </div>
      
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        <NavLink 
          to="/launchpad" 
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <Rocket className="sidebar-nav-icon" />
          <span>Launchpad</span>
        </NavLink>
        
        <NavLink 
          to="/marketplace" 
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <TrendingUp className="sidebar-nav-icon" />
          <span>Marketplace</span>
        </NavLink>
        
        <NavLink 
          to="/referrals" 
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <Users className="sidebar-nav-icon" />
          <span>Referral System</span>
        </NavLink>
        
        <NavLink 
          to="/account" 
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <Wallet className="sidebar-nav-icon" />
          <span>Stablecoin Account</span>
        </NavLink>

        <div className="sidebar-section-label">Security & Controls</div>
        
        <NavLink 
          to="/dms" 
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <Cpu className="sidebar-nav-icon" />
          <span>Device Manager</span>
        </NavLink>
        
        <NavLink 
          to="/admin" 
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <ShieldAlert className="sidebar-nav-icon" />
          <span>Super Admin</span>
        </NavLink>
      </nav>
    </aside>
  );
};
