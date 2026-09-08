import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import { 
  Waves, 
  Search, 
  Users, 
  Droplet, 
  Bell, 
  Activity, 
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

export const Navbar: React.FC<{ onOpenDemo: () => void; activeScenario: string }> = ({ onOpenDemo, activeScenario }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { role, switchRole, language, setLanguage, simpleLanguage, toggleSimpleLanguage } = useAuth();

  const navLinks = [
    { path: '/', label: t('nav.overview'), icon: Waves },
    { path: '/evidence', label: t('nav.evidence'), icon: Search },
    { path: '/citizen-observations', label: t('nav.citizen'), icon: Users },
    { path: '/water', label: t('nav.water'), icon: Droplet },
    { path: '/alerts', label: t('nav.alerts'), icon: Bell },
    { path: '/metrics', label: t('nav.metrics'), icon: Activity },
  ];

  const roles: { key: UserRole; label: string; icon: string }[] = [
    { key: 'RESIDENT', label: t('roles.resident'), icon: '👤' },
    { key: 'VOLUNTEER', label: t('roles.volunteer'), icon: '🤝' },
    { key: 'ADMIN', label: t('roles.admin'), icon: '⚙️' },
    { key: 'ANALYST', label: t('roles.analyst'), icon: '🔬' },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(8, 13, 26, 0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Top Banner for Active Demo Scenario */}
      {activeScenario && activeScenario !== 'NORMAL' && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.9), rgba(249, 115, 22, 0.9))',
          color: '#ffffff',
          padding: '6px 16px',
          fontSize: '0.84rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <Zap size={15} />
          <span>{t('demo.badge')}: <strong>{activeScenario}</strong></span>
          <button 
            onClick={onOpenDemo}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 8px',
              color: '#ffffff',
              fontSize: '0.78rem',
              cursor: 'pointer',
              marginLeft: '8px',
              fontWeight: 700
            }}
          >
            Switch Scenario
          </button>
        </div>
      )}

      <div className="app-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 'var(--header-height)',
        gap: '16px',
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--gradient-river)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)',
          }}>
            <Waves size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.15rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Kovai River Portal
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Community Evidence Network
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {navLinks.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--text-highlight)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Controls: Demo Switcher, Language, Simple Mode, Role Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Demo Button */}
          <button
            onClick={onOpenDemo}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.82rem', gap: '5px' }}
            title="Open Demo Scenarios"
          >
            <Sparkles size={14} color="#38bdf8" />
            <span>Demo Scenarios</span>
          </button>

          {/* Simple Language Mode Toggle */}
          <button
            onClick={toggleSimpleLanguage}
            className="btn"
            style={{
              padding: '6px 10px',
              fontSize: '0.8rem',
              background: simpleLanguage ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: simpleLanguage ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
              color: simpleLanguage ? '#34d399' : 'var(--text-secondary)',
              gap: '4px',
            }}
            title="Toggle Simple Language Mode for non-technical residents"
          >
            <Info size={13} />
            <span>{t('nav.simple_mode')}: {simpleLanguage ? 'ON' : 'OFF'}</span>
          </button>

          {/* Language Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
            <button
              onClick={() => setLanguage('en')}
              style={{
                background: language === 'en' ? 'var(--accent-blue)' : 'transparent',
                color: language === 'en' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ta')}
              style={{
                background: language === 'ta' ? 'var(--accent-blue)' : 'transparent',
                color: language === 'ta' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              தமிழ்
            </button>
          </div>

          {/* Role Switcher */}
          <div style={{ position: 'relative' }}>
            <select
              value={role}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              style={{
                background: 'rgba(30, 41, 59, 0.9)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
              aria-label="Switch User Role"
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.icon} {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
