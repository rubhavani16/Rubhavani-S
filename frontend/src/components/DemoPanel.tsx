import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  CloudOff, 
  Radio, 
  UserX, 
  TrendingDown, 
  RefreshCw 
} from 'lucide-react';

interface DemoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenario: string;
  onScenarioChanged: (newScenario: string) => void;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({
  isOpen,
  onClose,
  activeScenario,
  onScenarioChanged,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'NORMAL',
      title: 'Normal Operational State',
      description: 'All 4 environmental sources active, data is fresh (<2 hours), high confidence, all values in healthy range.',
      icon: CheckCircle2,
      color: '#10b981',
      tag: 'Baseline',
    },
    {
      id: 'MISSING_SENSOR',
      title: 'Missing Sensor Telemetry',
      description: 'Main in-situ sensor goes offline. The engine applies missing data penalty, drops confidence, and prompts citizen verification.',
      icon: Radio,
      color: '#f59e0b',
      tag: 'Data Gap',
    },
    {
      id: 'STALE_SATELLITE',
      title: 'Stale Satellite Remote Sensing',
      description: 'Cloud cover delays optical satellite pass for 12 days. Freshness drops to STALE, satellite contribution weight is attenuated.',
      icon: CloudOff,
      color: '#fb923c',
      tag: 'Freshness Lag',
    },
    {
      id: 'CONFLICTING',
      title: 'Conflicting Evidence (Sensor vs Citizen)',
      description: 'Automated sensor reports GOOD (82/100) while multiple residents report POOR water quality (35/100). System flags cross-source conflict and lowers confidence.',
      icon: AlertTriangle,
      color: '#ef4444',
      tag: 'Discrepancy',
    },
    {
      id: 'ANOMALY',
      title: 'Sensor Hardware Anomaly (pH Spike)',
      description: 'Sensor SENSOR-002 records an impossible pH of 2.3. Z-score anomaly detector flags it, excludes it from composite, and alerts operations.',
      icon: TrendingDown,
      color: '#ec4899',
      tag: 'Hardware Fault',
    },
    {
      id: 'NO_CITIZENS',
      title: 'No Citizen Observations (30 Days)',
      description: 'No community members submit ground observations. Citizen weight drops to zero and community engagement alert is triggered.',
      icon: UserX,
      color: '#8b5cf6',
      tag: 'Low Engagement',
    },
    {
      id: 'LOW_SATELLITE',
      title: 'High Cloud Obscuration (>80% Clouds)',
      description: 'Heavy monsoon cloud coverage prevents optical surface reflectance retrieval. Satellite index marked unusable.',
      icon: CloudOff,
      color: '#64748b',
      tag: 'Environmental Block',
    },
  ];

  const handleSelect = async (scenarioId: string) => {
    setLoading(true);
    try {
      await api.setDemoScenario(scenarioId);
      onScenarioChanged(scenarioId);
      onClose();
    } catch (err) {
      console.error('Failed to change scenario', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div 
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '32px',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-sky)',
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{t('demo.title')}</h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{t('demo.desc')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scenario List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scenarios.map((s) => {
            const isSelected = activeScenario === s.id;
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                onClick={() => !loading && handleSelect(s.id)}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? `2px solid ${s.color}` : '1px solid var(--border-subtle)',
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: `${s.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: s.color,
                  flexShrink: 0,
                }}>
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem', color: isSelected ? '#ffffff' : 'var(--text-primary)' }}>
                      {s.title}
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: `${s.color}25`,
                      color: s.color,
                    }}>
                      {s.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {s.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} className="pulse-animation" /> Applying scenario...
            </span>
          ) : (
            <span>Selecting a scenario instantly re-computes river health, confidence, and freshness across the portal.</span>
          )}
        </div>
      </div>
    </div>
  );
};
