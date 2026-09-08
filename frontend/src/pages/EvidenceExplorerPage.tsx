import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import type { EvidenceItem } from '../types';
import { ProvenanceModal } from '../components/ProvenanceModal';
import { 
  Search, 
  ShieldCheck, 
  Radio, 
  Cloud, 
  Users, 
  CheckCircle, 
  GitCommit, 
  AlertTriangle, 
  MessageSquare,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export const EvidenceExplorerPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [provenanceId, setProvenanceId] = useState<string | null>(null);

  // Filters from query params
  const sourceType = searchParams.get('source_type') || '';
  const freshness = searchParams.get('freshness') || '';
  const confidence = searchParams.get('confidence') || '';
  const healthLevel = searchParams.get('health_level') || '';
  const hasConflict = searchParams.get('has_conflict') === 'true';
  const hasAnomaly = searchParams.get('has_anomaly') === 'true';
  const search = searchParams.get('search') || '';

  const updateParam = (key: string, val: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set(key, val);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  useEffect(() => {
    async function loadEvidence() {
      setLoading(true);
      try {
        const data = await api.listEvidence({
          source_type: sourceType || undefined,
          freshness: freshness || undefined,
          confidence: confidence || undefined,
          health_level: healthLevel || undefined,
          has_conflict: hasConflict ? true : undefined,
          has_anomaly: hasAnomaly ? true : undefined,
          search: search || undefined,
        });
        setItems(data);
      } catch (err) {
        console.error('Failed to load evidence', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvidence();
  }, [sourceType, freshness, confidence, healthLevel, hasConflict, hasAnomaly, search]);

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'sensor': return Radio;
      case 'satellite': return Cloud;
      case 'citizen': return Users;
      case 'validation': return CheckCircle;
      default: return ShieldCheck;
    }
  };

  const getHealthClass = (lvl: string) => {
    switch (lvl) {
      case 'GOOD': return 'good';
      case 'MODERATE': return 'moderate';
      case 'CONCERNING': return 'concerning';
      case 'POOR': return 'poor';
      default: return 'moderate';
    }
  };

  return (
    <div className="page-content app-container">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>
          {t('explorer.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          {t('explorer.subtitle')}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => updateParam('search', e.target.value)}
              placeholder={t('explorer.search_placeholder')}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontSize: '0.86rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Source Type Filter */}
          <select
            value={sourceType}
            onChange={(e) => updateParam('source_type', e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
            }}
          >
            <option value="">All Sources</option>
            <option value="composite">Composite Index</option>
            <option value="sensor">Telemetry Sensors</option>
            <option value="satellite">Sentinel-2 Satellite</option>
            <option value="citizen">Citizen Observations</option>
            <option value="validation">Volunteer Validations</option>
          </select>

          {/* Freshness Filter */}
          <select
            value={freshness}
            onChange={(e) => updateParam('freshness', e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
            }}
          >
            <option value="">All Freshness</option>
            <option value="FRESH">Fresh</option>
            <option value="AGING">Aging</option>
            <option value="STALE">Stale</option>
            <option value="MISSING">Missing</option>
          </select>

          {/* Confidence Filter */}
          <select
            value={confidence}
            onChange={(e) => updateParam('confidence', e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
            }}
          >
            <option value="">All Confidence</option>
            <option value="HIGH">High Confidence</option>
            <option value="MEDIUM">Medium Confidence</option>
            <option value="LOW">Low Confidence</option>
          </select>

          {/* Health Assessment Filter */}
          <select
            value={healthLevel}
            onChange={(e) => updateParam('health_level', e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
            }}
          >
            <option value="">All Health Status</option>
            <option value="GOOD">Good</option>
            <option value="MODERATE">Moderate</option>
            <option value="CONCERNING">Concerning</option>
            <option value="POOR">Poor</option>
          </select>

          {/* Reset Filters */}
          {(sourceType || freshness || confidence || healthLevel || search || hasConflict || hasAnomaly) && (
            <button
              onClick={() => setSearchParams(new URLSearchParams())}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <RefreshCw className="pulse-animation" size={24} color="var(--accent-sky)" />
          <div style={{ marginTop: '10px' }}>Searching evidence corpus...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <AlertTriangle size={32} color="var(--status-moderate)" style={{ marginBottom: '12px' }} />
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>No Evidence Items Match Filters</div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Try clearing filters or changing the search keyword.
          </p>
          <button onClick={() => setSearchParams(new URLSearchParams())} className="btn btn-primary">
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item) => {
            const Icon = getSourceIcon(item.source_type);
            const healthClass = getHealthClass(item.health_assessment);
            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-sky)',
                    }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.02rem', color: '#ffffff' }}>
                        {item.source_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Location: <strong>{item.location}</strong> &bull; Collected: {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-pill ${healthClass}`}>
                      {item.health_assessment}
                    </span>
                    <span className={`freshness-badge ${item.freshness_status.toLowerCase()}`}>
                      {item.freshness_status}
                    </span>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-secondary)',
                    }}>
                      {item.confidence_level} ({Math.round(item.confidence_score)}%)
                    </span>
                  </div>
                </div>

                {/* Raw Metric Summary */}
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.84rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-highlight)',
                }}>
                  {item.raw_metric_summary}
                </div>

                {/* Flags / Alerts */}
                {(item.has_anomaly || item.has_conflict) && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {item.has_anomaly && (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#f87171',
                        background: 'rgba(239,68,68,0.15)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <AlertTriangle size={12} /> ANOMALY DETECTED
                      </span>
                    )}
                    {item.has_conflict && (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#fb923c',
                        background: 'rgba(249,115,22,0.15)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <AlertTriangle size={12} /> CONFLICTING REPORTS
                      </span>
                    )}
                  </div>
                )}

                {/* Actions Footer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  fontSize: '0.84rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MessageSquare size={14} /> {item.question_count} Community Questions
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setProvenanceId(item.id)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '5px' }}
                    >
                      <GitCommit size={14} /> {t('explorer.provenance_btn')}
                    </button>
                    <Link
                      to={`/evidence/${item.id}`}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', gap: '5px' }}
                    >
                      <span>{t('explorer.drilldown_btn')}</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provenance Modal */}
      <ProvenanceModal
        evidenceId={provenanceId}
        onClose={() => setProvenanceId(null)}
      />
    </div>
  );
};
