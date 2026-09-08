import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Alert, Question } from '../types';
import { 
  Bell, 
  HelpCircle, 
  CheckCircle, 
  Send, 
  RefreshCw
} from 'lucide-react';

export const AlertsQuestionsPage: React.FC = () => {
  const { role } = useAuth();

  const [tab, setTab] = useState<'alerts' | 'questions'>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // New question form
  const [qType, setQType] = useState('ACCURACY');
  const [comment, setComment] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);

  // Admin response modal
  const [answeringQ, setAnsweringQ] = useState<Question | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [submittingResp, setSubmittingResp] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [al, ql] = await Promise.all([
        api.listAlerts(),
        api.listQuestions(),
      ]);
      setAlerts(al);
      setQuestions(ql);
    } catch (err) {
      console.error('Failed to load alerts/questions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveAlert = async (id: number) => {
    try {
      await api.resolveAlert(id);
      await loadData();
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingQ(true);
    try {
      await api.createQuestion({
        evidence_type: 'composite',
        question_type: qType,
        comment: comment.trim(),
      });
      setComment('');
      await loadData();
    } catch (err) {
      console.error('Failed to submit question', err);
    } finally {
      setSubmittingQ(false);
    }
  };

  const handleAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringQ || !adminResponse.trim()) return;
    setSubmittingResp(true);
    try {
      await api.respondToQuestion(answeringQ.id, adminResponse.trim(), 'RESOLVED');
      setAnsweringQ(null);
      setAdminResponse('');
      await loadData();
    } catch (err) {
      console.error('Failed to reply to question', err);
    } finally {
      setSubmittingResp(false);
    }
  };

  const canAdminRespond = role === 'ADMIN' || role === 'VOLUNTEER' || role === 'ANALYST';

  return (
    <div className="page-content app-container">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>
          Alerts & Community Questions
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Real-time anomaly warnings, data gaps, and transparent community question answering.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          onClick={() => setTab('alerts')}
          className="btn"
          style={{
            background: tab === 'alerts' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: tab === 'alerts' ? 'var(--text-highlight)' : 'var(--text-secondary)',
            border: tab === 'alerts' ? '1px solid var(--border-glow)' : '1px solid transparent',
            gap: '8px',
          }}
        >
          <Bell size={16} />
          <span>Operational Alerts ({alerts.filter(a => !a.is_resolved).length} Open)</span>
        </button>

        <button
          onClick={() => setTab('questions')}
          className="btn"
          style={{
            background: tab === 'questions' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: tab === 'questions' ? 'var(--text-highlight)' : 'var(--text-secondary)',
            border: tab === 'questions' ? '1px solid var(--border-glow)' : '1px solid transparent',
            gap: '8px',
          }}
        >
          <HelpCircle size={16} />
          <span>Citizen Challenges & Questions ({questions.filter(q => q.status === 'OPEN').length} Open)</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <RefreshCw className="pulse-animation" size={24} color="var(--accent-sky)" />
          <div style={{ marginTop: '10px' }}>Loading alerts and community challenges...</div>
        </div>
      ) : tab === 'alerts' ? (
        /* Alerts Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {alerts.map((a) => {
            const isWarning = a.severity === 'WARNING';
            const isCritical = a.severity === 'CRITICAL';
            return (
              <div
                key={a.id}
                className="glass-panel"
                style={{
                  padding: '18px 22px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `4px solid ${isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#3b82f6'}`,
                  opacity: a.is_resolved ? 0.65 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: isCritical ? 'rgba(239, 68, 68, 0.2)' : isWarning ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: isCritical ? '#f87171' : isWarning ? '#fbbf24' : '#60a5fa',
                    }}>
                      {a.severity} &bull; {a.alert_type}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>

                  {a.is_resolved ? (
                    <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> Resolved
                    </span>
                  ) : canAdminRespond ? (
                    <button
                      onClick={() => handleResolveAlert(a.id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                    >
                      Mark Resolved ({role})
                    </button>
                  ) : null}
                </div>

                <div style={{ fontWeight: 700, fontSize: '1.02rem', color: '#ffffff', marginBottom: '6px' }}>
                  {a.title}
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {a.message}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Questions Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Ask Question Form */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>
              Ask a Question or Challenge an Environmental Finding
            </h3>
            <form onSubmit={handleCreateQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem',
                  }}
                >
                  <option value="ACCURACY">Challenge Accuracy (Reading contradicts my observation)</option>
                  <option value="FRESHNESS">Challenge Freshness (Data is too old to be trusted)</option>
                  <option value="SOURCE_RELIABILITY">Source Reliability (Sensor appears faulty)</option>
                  <option value="INTERPRETATION">Clarification on Interpretation</option>
                  <option value="MISSING_DATA">Missing Data Question</option>
                </select>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What would you like to question or clarify about river health evidence?"
                rows={2}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submittingQ}
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '6px 16px', gap: '6px' }}
                >
                  <Send size={14} />
                  <span>{submittingQ ? 'Posting...' : 'Post Question'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Questions Feed */}
          {questions.map((q) => (
            <div
              key={q.id}
              className="glass-panel"
              style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: 'var(--accent-sky)',
                  }}>
                    {q.question_type}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    By <strong>{q.username || `User #${q.user_id}`}</strong> &bull; {new Date(q.created_at).toLocaleString()}
                  </span>
                </div>

                <span style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: q.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: q.status === 'RESOLVED' ? '#34d399' : '#fbbf24',
                }}>
                  {q.status}
                </span>
              </div>

              <div style={{ fontSize: '0.92rem', color: '#ffffff', lineHeight: 1.5, marginBottom: q.admin_response ? '12px' : '6px' }}>
                "{q.comment}"
              </div>

              {q.admin_response && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--accent-sky)',
                  fontSize: '0.84rem',
                  color: 'var(--text-highlight)',
                }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-sky)', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Response from Portal Team
                  </div>
                  {q.admin_response}
                </div>
              )}

              {canAdminRespond && !q.admin_response && (
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setAnsweringQ(q);
                      setAdminResponse('');
                    }}
                    className="btn btn-outline"
                    style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                  >
                    Provide Administrative Answer ({role})
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {answeringQ && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 220,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div className="glass-panel-elevated" style={{ width: '100%', maxWidth: '540px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px' }}>
              Answer Community Question #{answeringQ.id}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px', fontStyle: 'italic' }}>
              "{answeringQ.comment}"
            </p>

            <form onSubmit={handleAdminResponse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Provide clear, transparent rationale explaining the evidence or planned investigation..."
                rows={4}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAnsweringQ(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResp}
                  className="btn btn-primary"
                >
                  {submittingResp ? 'Publishing...' : 'Publish Answer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
