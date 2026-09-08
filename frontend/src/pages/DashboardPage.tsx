import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { RiverHealthData, WaterSummary } from '../types';
import { 
  Waves, 
  Clock, 
  AlertTriangle, 
  Droplets, 
  ArrowRight, 
  Search, 
  Users, 
  Activity, 
  HelpCircle,
  TrendingDown
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { simpleLanguage } = useAuth();
  const [data, setData] = useState<RiverHealthData | null>(null);
  const [waterSummary, setWaterSummary] = useState<WaterSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [rh, ws] = await Promise.all([
          api.getRiverHealth(),
          api.getWaterSummary(),
        ]);
        setData(rh);
        setWaterSummary(ws);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="page-content app-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
          <Waves className="pulse-animation" size={24} color="var(--accent-sky)" />
          <span>Synthesizing river health evidence from sensors, satellites, and community reports...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-content app-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div style={{ color: 'var(--status-poor)' }}>Unable to connect to River Health Evidence API.</div>
      </div>
    );
  }

  const getHealthClass = (lvl: string) => {
    switch (lvl) {
      case 'GOOD': return 'good';
      case 'MODERATE': return 'moderate';
      case 'CONCERNING': return 'concerning';
      case 'POOR': return 'poor';
      default: return 'moderate';
    }
  };

  const getFreshnessClass = (status: string) => {
    switch (status) {
      case 'FRESH': return 'fresh';
      case 'AGING': return 'aging';
      case 'STALE': return 'stale';
      case 'MISSING': return 'missing';
      default: return 'missing';
    }
  };

  const healthClass = getHealthClass(data.health_level);

  return (
    <div className="page-content app-container">
      {/* Simulation Disclosure Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px dashed var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
      }}>
        <span>{t('disclaimer')}</span>
        <span>Community Apartment Complex: <strong>Kovai River Enclave (4 Blocks)</strong></span>
      </div>

      {/* Critical Conflict / Anomaly Warning Banners */}
      {data.has_conflict && (
        <div style={{
          background: 'rgba(249, 115, 22, 0.12)',
          border: '1px solid rgba(249, 115, 22, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <AlertTriangle size={24} color="#fb923c" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#fb923c', fontSize: '0.96rem' }}>
              Divergent Evidence Detected (Cross-Source Conflict)
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {data.conflict_description || 'In-situ automated sensors indicate GOOD water quality, but recent verified resident observations report POOR conditions. Community field validation has been scheduled.'}
            </div>
          </div>
          <Link to="/evidence?has_conflict=true" className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
            Inspect Conflict
          </Link>
        </div>
      )}

      {data.has_anomaly && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <TrendingDown size={24} color="#f87171" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.96rem' }}>
              Telemetry Anomaly Flagged ({data.anomaly_count} detected)
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {data.anomaly_description || 'Sudden statistical z-score deviation or physical bounds violation. Outlier readings are isolated to preserve composite accuracy.'}
            </div>
          </div>
          <Link to="/alerts" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
            View Alerts
          </Link>
        </div>
      )}

      {/* Main Grid: Health Card + Confidence Card */}
      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        {/* Card 1: River Health Status */}
        <div className="glass-panel" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Primary Community Question #1
              </span>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '2px' }}>
                {t('health.title')}
              </h2>
            </div>
            <span className={`status-pill ${healthClass}`}>
              {t(`health.${data.health_level.toLowerCase()}`)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', margin: '20px 0' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: `radial-gradient(circle, var(--status-${healthClass}-bg) 0%, rgba(0,0,0,0.4) 100%)`,
              border: `3px solid var(--status-${healthClass})`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 20px var(--status-${healthClass}-bg)`,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
                {Math.round(data.final_score)}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
            </div>

            <div>
              <p style={{ fontSize: '0.94rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '8px' }}>
                {simpleLanguage 
                  ? `Overall river condition is ${data.health_label}. This is calculated from local sensors, satellite views, and your neighbors' reports.`
                  : data.explanation}
              </p>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {t(`health.${data.health_level.toLowerCase()}_desc`)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Active sources: <strong>{data.active_sources} / {data.total_sources}</strong>
            </span>
            <Link to="/evidence/composite-current" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 600 }}>
              <span>How do we know? (Drill-down)</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Card 2: Confidence Model */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Primary Community Question #5
              </span>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '2px' }}>
                {t('confidence.title')}
              </h2>
            </div>
            <span style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: data.confidence_level === 'HIGH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: data.confidence_level === 'HIGH' ? '#34d399' : '#fbbf24',
              border: `1px solid ${data.confidence_level === 'HIGH' ? '#10b98155' : '#f59e0b55'}`,
            }}>
              {t(`confidence.${data.confidence_level.toLowerCase()}`)} ({Math.round(data.confidence_score)}%)
            </span>
          </div>

          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {data.confidence_explanation}
          </p>

          {/* Factor Breakdown Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(data.confidence_factors || {}).map(([key, val]) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t(`confidence.${key}`, key.replace('_', ' '))}</span>
                  <span style={{ fontWeight: 600 }}>{Math.round(val as number)}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, Math.max(0, val as number))}%`,
                    height: '100%',
                    background: (val as number) >= 75 ? 'var(--status-good)' : (val as number) >= 50 ? 'var(--status-moderate)' : 'var(--status-poor)',
                    borderRadius: '3px',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Evidence Freshness Matrix + Evidence Contributions */}
      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        {/* Freshness Matrix */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={18} color="var(--accent-sky)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{t('freshness.title')}</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            How recent is each evidence stream? Stale data triggers uncertainty penalties.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {Object.entries(data.freshness || {}).map(([src, item]) => {
              const fClass = getFreshnessClass(item.status);
              return (
                <div key={src} style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                      {t(`freshness.${src}`)}
                    </span>
                    <span className={`freshness-badge ${fClass}`}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {item.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Contribution Breakdown */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Evidence Weighted Aggregation</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Transparent weighting formula combining physics telemetry, satellite imagery, and resident science.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(data.evidence_contributions || {}).map(([key, item]) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{t(`sources.${key}`)}</span>
                  <span>
                    <strong>{item.contribution.toFixed(1)}</strong> / {item.max} pts ({item.score.toFixed(0)}/100)
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(item.contribution / item.max) * 100}%`,
                    height: '100%',
                    background: 'var(--gradient-river)',
                    borderRadius: '4px',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Water Conservation Progress Card */}
      {waterSummary && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}>
                <Droplets size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{t('water.title')}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t('water.subtitle')}</p>
              </div>
            </div>
            <Link to="/water" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
              View Conservation Trends
            </Link>
          </div>

          <div className="grid-cols-4">
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Current Daily Average</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                {Math.round(waterSummary.current_daily_average).toLocaleString()} L/day
              </div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Baseline Consumption</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '2px' }}>
                {Math.round(waterSummary.baseline_daily_average).toLocaleString()} L/day
              </div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Community Water Saved</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                {waterSummary.percentage_saved.toFixed(1)}% (Target: {waterSummary.target_percentage}%)
              </div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Estimated Water Conserved</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-sky)', marginTop: '2px' }}>
                {Math.round(waterSummary.total_saved_liters).toLocaleString()} Liters
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid-cols-4">
        <Link to="/evidence" className="glass-panel" style={{ padding: '20px', textDecoration: 'none' }}>
          <Search size={22} color="var(--accent-sky)" style={{ marginBottom: '10px' }} />
          <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Explore Evidence</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Browse and filter all telemetry, satellite, and community reports.
          </div>
        </Link>

        <Link to="/citizen-observations" className="glass-panel" style={{ padding: '20px', textDecoration: 'none' }}>
          <Users size={22} color="var(--accent-cyan)" style={{ marginBottom: '10px' }} />
          <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Submit Observation</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Log water smell, color, waste, and fish activity to verify river health.
          </div>
        </Link>

        <Link to="/alerts" className="glass-panel" style={{ padding: '20px', textDecoration: 'none' }}>
          <HelpCircle size={22} color="#fbbf24" style={{ marginBottom: '10px' }} />
          <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Question Evidence</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Challenge findings or report discrepancies directly to community admins.
          </div>
        </Link>

        <Link to="/metrics" className="glass-panel" style={{ padding: '20px', textDecoration: 'none' }}>
          <Activity size={22} color="#a78bfa" style={{ marginBottom: '10px' }} />
          <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>System Metrics</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Review validation datasets, baseline benchmarks, and error analysis.
          </div>
        </Link>
      </div>
    </div>
  );
};
