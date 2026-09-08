import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { SystemMetrics } from '../types';
import { 
  AlertCircle, 
  Database, 
  TrendingUp
} from 'lucide-react';

export const MetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await api.getMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load metrics', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="page-content app-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading system telemetry and experiment benchmarks...</div>
      </div>
    );
  }

  return (
    <div className="page-content app-container">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>
          System Metrics & Validation Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Evaluation benchmarks, user interpretation accuracy, error analysis, and validation dataset performance.
        </p>
      </div>

      {/* System Operational KPIs */}
      <div className="grid-cols-4" style={{ marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Telemetry Readings</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
            {metrics.system.total_sensor_readings.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Missing rate: <strong>{metrics.system.missing_data_rate}%</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Satellite Overpass Usability</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-sky)', marginTop: '4px' }}>
            {metrics.system.satellite_availability}%
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {metrics.system.total_satellite_observations} total passes evaluated
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Citizen Verification Coverage</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {metrics.system.citizen_validation_coverage}%
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {metrics.system.total_citizen_observations} total observations submitted
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Validation Dataset Accuracy</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>
            {metrics.validation_dataset.accuracy}%
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {metrics.validation_dataset.correct} of {metrics.validation_dataset.total} test cases passed
          </div>
        </div>
      </div>

      {/* Experiment Results: Baseline vs Target vs Measured Table */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <TrendingUp size={20} color="var(--accent-sky)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            User Comprehension & Usability Experiment Results
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Evaluation Metric</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Baseline</th>
                <th style={{ padding: '10px 12px' }}>Target</th>
                <th style={{ padding: '10px 12px' }}>Measured</th>
                <th style={{ padding: '10px 12px' }}>Improvement</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.experiment.results.map((res, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#ffffff' }}>
                    {res.metric}
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 400 }}>{res.description}</div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{res.category}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{res.baseline}%</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{res.target}%</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#ffffff' }}>{res.measured}%</td>
                  <td style={{ padding: '12px', color: '#34d399', fontWeight: 600 }}>
                    +{res.improvement}%
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: res.passes ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: res.passes ? '#34d399' : '#f87171',
                    }}>
                      {res.passes ? 'PASS' : 'PARTIAL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Analysis Section */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle size={20} color="#fbbf24" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            User Interpretation Error Analysis & UI Improvements
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {metrics.error_analysis.map((err, i) => (
            <div
              key={i}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.94rem', color: '#fbbf24' }}>
                  {err.error_type} ({err.percentage}% of observed errors)
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Occurred {err.count} times in pilot testing
                </span>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                <strong>Example Task Failure:</strong> {err.example_task}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <strong>Root Cause:</strong> {err.likely_reason}
              </div>
              <div style={{
                fontSize: '0.82rem',
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.08)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid #10b981',
              }}>
                <strong>Implemented Portal Remediation:</strong> {err.ui_improvement}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Validation Dataset Test Cases */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Database size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            Ground Truth Validation Dataset (Edge Cases & Failure Modes)
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 10px' }}>ID</th>
                <th style={{ padding: '8px 10px' }}>Evidence Type</th>
                <th style={{ padding: '8px 10px' }}>Actual State</th>
                <th style={{ padding: '8px 10px' }}>Expected Classification</th>
                <th style={{ padding: '8px 10px' }}>System Classification</th>
                <th style={{ padding: '8px 10px' }}>Evaluation</th>
                <th style={{ padding: '8px 10px' }}>Error Type</th>
              </tr>
            </thead>
            <tbody>
              {metrics.validation_dataset.entries.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '10px' }}>#{v.id}</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{v.evidence_type}</td>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{v.actual_condition}</td>
                  <td style={{ padding: '10px' }}>{v.expected_interpretation}</td>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#ffffff' }}>{v.actual_system_interpretation}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: v.is_correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: v.is_correct ? '#34d399' : '#f87171',
                    }}>
                      {v.is_correct ? 'CORRECT' : 'MISCLASSIFIED'}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {v.error_type || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
