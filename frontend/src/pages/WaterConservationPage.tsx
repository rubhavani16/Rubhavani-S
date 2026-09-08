import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import type { WaterSummary } from '../types';
import { 
  Building2, 
  Waves
} from 'lucide-react';

export const WaterConservationPage: React.FC = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<WaterSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const ws = await api.getWaterSummary();
        setSummary(ws);
      } catch (err) {
        console.error('Failed to load water consumption data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="page-content app-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading community water conservation analytics...</div>
      </div>
    );
  }

  return (
    <div className="page-content app-container">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>
          {t('water.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          {t('water.subtitle')}
        </p>
      </div>

      {/* Hero Stats */}
      <div className="grid-cols-4" style={{ marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Community Water Reduction</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {summary.percentage_saved.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Target: <strong>{summary.target_percentage}%</strong> below baseline
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Estimated Cumulative Saved</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-sky)', marginTop: '4px' }}>
            {Math.round(summary.total_saved_liters).toLocaleString()} L
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Preserved for river baseline flow
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Current Daily Average</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
            {Math.round(summary.current_daily_average).toLocaleString()} L
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across all 4 residential blocks
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Target Consumption</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
            {Math.round(summary.target_daily_average).toLocaleString()} L
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Achieving 20% sustainable footprint
          </div>
        </div>
      </div>

      {/* Building-by-Building Performance Grid */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Building2 size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Block-by-Block Conservation Standing</h3>
        </div>

        <div className="grid-cols-4">
          {Object.entries(summary.by_building || {}).map(([bldg, bData]) => (
            <div
              key={bldg}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.02rem', color: '#ffffff' }}>{bldg}</span>
                <span style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: bData.saved_percentage >= 15 ? '#34d399' : '#fbbf24',
                  background: bData.saved_percentage >= 15 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}>
                  {bData.saved_percentage.toFixed(1)}% Saved
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Current: <strong>{Math.round(bData.current_liters).toLocaleString()} L/day</strong></div>
                <div>Baseline: {Math.round(bData.baseline_liters).toLocaleString()} L/day</div>
                <div>Target: {Math.round(bData.target_liters).toLocaleString()} L/day</div>
              </div>

              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (bData.saved_percentage / 20) * 100)}%`,
                  height: '100%',
                  background: 'var(--gradient-river)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ecological Link: Why Community Water Conservation Matters */}
      <div className="glass-panel" style={{ padding: '28px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Waves size={24} color="var(--accent-sky)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            How Your Indoor Conservation Directly Protects the Kovai River
          </h3>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>
            When residential communities extract excess municipal water from local aquifers and upstream intakes, the dry-season environmental flow (base-flow) of the river drops below critical thresholds. Low water volume accelerates water stagnation, raises temperatures, promotes eutrophic algae blooms, and drops dissolved oxygen below 4.0 mg/L (causing fish hypoxia).
          </p>
          <div className="grid-cols-2" style={{ marginTop: '8px' }}>
            <div style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
                1. Preserving Natural Dilution Flow
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Sustained base-flow ensures runoff pollutants are naturally diluted rather than concentrated in shallow river pools.
              </div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-sky)', marginBottom: '4px' }}>
                2. Maintaining Dissolved Oxygen
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Riffles and active water depth oxygenate the water column, supporting local fish biodiversity and preventing foul odors.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
