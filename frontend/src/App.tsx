import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { DemoPanel } from './components/DemoPanel';
import { DashboardPage } from './pages/DashboardPage';
import { EvidenceExplorerPage } from './pages/EvidenceExplorerPage';
import { EvidenceDetailPage } from './pages/EvidenceDetailPage';
import { CitizenObservationsPage } from './pages/CitizenObservationsPage';
import { WaterConservationPage } from './pages/WaterConservationPage';
import { AlertsQuestionsPage } from './pages/AlertsQuestionsPage';
import { MetricsPage } from './pages/MetricsPage';
import { api } from './services/api';
import './i18n';

export const App: React.FC = () => {
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState('NORMAL');

  useEffect(() => {
    // Check initial scenario on load
    api.getDemoScenarios()
      .then((data) => {
        if (data && data.active) {
          setActiveScenario(data.active);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Skip Navigation for accessibility */}
          <a
            href="#main-content"
            className="sr-only"
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: '#38bdf8',
              color: '#080d1a',
              padding: '8px 16px',
              fontWeight: 700,
              zIndex: 9999,
            }}
          >
            Skip to main content
          </a>

          <Navbar
            onOpenDemo={() => setDemoOpen(true)}
            activeScenario={activeScenario}
          />

          <main id="main-content" style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/evidence" element={<EvidenceExplorerPage />} />
              <Route path="/evidence/:id" element={<EvidenceDetailPage />} />
              <Route path="/citizen-observations" element={<CitizenObservationsPage />} />
              <Route path="/water" element={<WaterConservationPage />} />
              <Route path="/alerts" element={<AlertsQuestionsPage />} />
              <Route path="/metrics" element={<MetricsPage />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer style={{
            background: 'rgba(8, 13, 26, 0.95)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '24px 0',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}>
            <div className="app-container">
              <div>Community River Health Evidence Portal &bull; Kovai River Basin Initiative</div>
              <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                Pedagogical and demonstration prototype. Sensor and remote sensing data are realistic simulations.
              </div>
            </div>
          </footer>

          {/* Demo Scenarios Modal */}
          <DemoPanel
            isOpen={demoOpen}
            onClose={() => setDemoOpen(false)}
            activeScenario={activeScenario}
            onScenarioChanged={(newScen) => {
              setActiveScenario(newScen);
              window.location.reload();
            }}
          />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
