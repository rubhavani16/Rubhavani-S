import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { CitizenObservation } from '../types';
import { 
  PlusCircle, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Send,
  RefreshCw
} from 'lucide-react';

export const CitizenObservationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { role } = useAuth();

  const [observations, setObservations] = useState<CitizenObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form inputs
  const [location, setLocation] = useState('River Bend Park');
  const [waterColor, setWaterColor] = useState('CLEAR');
  const [smell, setSmell] = useState('NONE');
  const [visibleWaste, setVisibleWaste] = useState(false);
  const [algaePresence, setAlgaePresence] = useState(false);
  const [fishActivity, setFishActivity] = useState('ACTIVE');
  const [overallCondition, setOverallCondition] = useState('GOOD');
  const [userComment, setUserComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validation modal state
  const [validatingObs, setValidatingObs] = useState<CitizenObservation | null>(null);
  const [valStatus, setValStatus] = useState('VALIDATED');
  const [valScore, setValScore] = useState(85);
  const [valNotes, setValNotes] = useState('');
  const [valSubmitting, setValSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.listCitizenObservations();
      setObservations(data);
    } catch (err) {
      console.error('Failed to load observations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userComment.trim()) return;
    setSubmitting(true);
    try {
      await api.createCitizenObservation({
        location,
        water_color: waterColor,
        smell,
        visible_waste: visibleWaste,
        algae_presence: algaePresence,
        fish_activity: fishActivity,
        overall_condition: overallCondition,
        user_comment: userComment.trim(),
        confidence: 0.85,
      });
      setUserComment('');
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error('Failed to submit observation', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatingObs) return;
    setValSubmitting(true);
    try {
      await api.createValidation({
        observation_id: validatingObs.id,
        validation_status: valStatus,
        validation_score: valScore,
        notes: valNotes,
      });
      setValidatingObs(null);
      setValNotes('');
      await loadData();
    } catch (err) {
      console.error('Failed to validate observation', err);
    } finally {
      setValSubmitting(false);
    }
  };

  const canValidate = role === 'VOLUNTEER' || role === 'ADMIN' || role === 'ANALYST';

  return (
    <div className="page-content app-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>
            {t('citizen.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Resident observations contribute 20% to the composite river health model. Ground reports help verify automated sensor readings.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          style={{ gap: '8px' }}
        >
          <PlusCircle size={18} />
          <span>{showForm ? 'Cancel Form' : t('citizen.submit_btn')}</span>
        </button>
      </div>

      {/* Observation Submission Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px', border: '1px solid var(--accent-cyan)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>
            Submit Visual River Health Report
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-cols-2">
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t('citizen.location')}
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                  }}
                >
                  <option value="River Bend Park">River Bend Park (Midstream)</option>
                  <option value="Community Ghat">Community Ghat (Near Block B)</option>
                  <option value="Old Bridge">Old Bridge (Downstream)</option>
                  <option value="Upstream Walk">Upstream Walk (Near Reservoir)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t('citizen.condition')}
                </label>
                <select
                  value={overallCondition}
                  onChange={(e) => setOverallCondition(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                  }}
                >
                  <option value="GOOD">Good — Clean, clear, healthy</option>
                  <option value="MODERATE">Moderate — Slight turbidity, acceptable</option>
                  <option value="POOR">Poor — Murky, smelly, or trash present</option>
                </select>
              </div>
            </div>

            <div className="grid-cols-4">
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t('citizen.water_color')}
                </label>
                <select
                  value={waterColor}
                  onChange={(e) => setWaterColor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                  }}
                >
                  <option value="CLEAR">Clear</option>
                  <option value="SLIGHTLY_TURBID">Slightly Turbid</option>
                  <option value="TURBID">Turbid / Muddy</option>
                  <option value="GREEN_TINT">Green Tint</option>
                  <option value="BROWN">Dark Brown</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t('citizen.smell')}
                </label>
                <select
                  value={smell}
                  onChange={(e) => setSmell(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                  }}
                >
                  <option value="NONE">No Odor</option>
                  <option value="SLIGHT">Slight Earthy</option>
                  <option value="MODERATE">Moderate Odor</option>
                  <option value="STRONG">Strong / Chemical</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t('citizen.fish')}
                </label>
                <select
                  value={fishActivity}
                  onChange={(e) => setFishActivity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                  }}
                >
                  <option value="ACTIVE">Active Fish / Birds</option>
                  <option value="LOW">Low Activity</option>
                  <option value="VERY_LOW">Very Low</option>
                  <option value="NONE">No Visible Wildlife</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#ffffff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={visibleWaste}
                    onChange={(e) => setVisibleWaste(e.target.checked)}
                  />
                  <span>{t('citizen.waste')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#ffffff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={algaePresence}
                    onChange={(e) => setAlgaePresence(e.target.checked)}
                  />
                  <span>{t('citizen.algae')}</span>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                {t('citizen.comment')}
              </label>
              <textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="Describe what you observed (e.g. water clarity, foam, debris, surface flow)..."
                rows={3}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ gap: '6px' }}
              >
                <Send size={15} />
                <span>{submitting ? 'Submitting...' : 'Submit Observation'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Observations Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <RefreshCw className="pulse-animation" size={24} color="var(--accent-sky)" />
          <div style={{ marginTop: '10px' }}>Loading ground truth feed...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {observations.map((obs) => {
            const isVal = obs.verification_status === 'VALIDATED';
            const isPart = obs.verification_status === 'PARTIALLY_VALIDATED';
            return (
              <div
                key={obs.id}
                className="glass-panel"
                style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(6, 182, 212, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                    }}>
                      {obs.username ? obs.username.slice(0, 2).toUpperCase() : 'CO'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.94rem' }}>
                        {obs.username || `Observer #${obs.user_id}`}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} /> <span>{obs.location}</span>
                        &bull;
                        <Clock size={13} /> <span>{new Date(obs.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-pill ${(obs.overall_condition || 'MODERATE').toLowerCase()}`}>
                      {obs.overall_condition || 'MODERATE'}
                    </span>
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: isVal ? 'rgba(16, 185, 129, 0.15)' : isPart ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                      color: isVal ? '#34d399' : isPart ? '#fbbf24' : 'var(--text-muted)',
                      border: `1px solid ${isVal ? '#10b98155' : isPart ? '#f59e0b55' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                      {obs.verification_status}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '14px' }}>
                  "{obs.user_comment}"
                </p>

                {/* Attribute tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.78rem', marginBottom: '14px' }}>
                  <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    Color: <strong>{obs.water_color || 'N/A'}</strong>
                  </span>
                  <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    Odor: <strong>{obs.smell || 'None'}</strong>
                  </span>
                  <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    Wildlife: <strong>{obs.fish_activity || 'Active'}</strong>
                  </span>
                  {obs.visible_waste && (
                    <span style={{ padding: '3px 8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '4px', fontWeight: 600 }}>
                      Visible Floating Trash
                    </span>
                  )}
                  {obs.algae_presence && (
                    <span style={{ padding: '3px 8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderRadius: '4px', fontWeight: 600 }}>
                      Algae Mats Present
                    </span>
                  )}
                </div>

                {/* Footer Validation Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Observer Confidence: {Math.round((obs.confidence || 0.7) * 100)}%
                  </span>

                  {canValidate && obs.verification_status === 'PENDING' && (
                    <button
                      onClick={() => {
                        setValidatingObs(obs);
                        setValStatus('VALIDATED');
                        setValScore(85);
                      }}
                      className="btn btn-outline"
                      style={{ padding: '4px 12px', fontSize: '0.8rem', gap: '4px' }}
                    >
                      <ShieldCheck size={14} />
                      <span>{t('citizen.validate_btn')} ({role})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Validation Modal for Volunteers/Admins */}
      {validatingObs && (
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
              Volunteer Ground Truth Verification
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Verifying report #{validatingObs.id} at {validatingObs.location}
            </p>

            <form onSubmit={handleValidation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Verification Status
                </label>
                <select
                  value={valStatus}
                  onChange={(e) => setValStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                  }}
                >
                  <option value="VALIDATED">Validated (Confirmed by field visit / photos)</option>
                  <option value="PARTIALLY_VALIDATED">Partially Validated (Minor discrepancy)</option>
                  <option value="REJECTED">Rejected (Unsubstantiated or mistaken)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Reliability Score: {valScore}/100
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={valScore}
                  onChange={(e) => setValScore(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Volunteer Field Notes
                </label>
                <textarea
                  value={valNotes}
                  onChange={(e) => setValNotes(e.target.value)}
                  placeholder="Notes from site visit or photographic cross-reference..."
                  rows={3}
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setValidatingObs(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={valSubmitting}
                  className="btn btn-primary"
                >
                  {valSubmitting ? 'Saving...' : 'Confirm Validation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
