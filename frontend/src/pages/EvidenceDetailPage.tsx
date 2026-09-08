import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import type { EvidenceDetail } from '../types';
import { ProvenanceModal } from '../components/ProvenanceModal';
import { 
  ArrowLeft, 
  CheckCircle, 
  GitCommit, 
  MessageSquare, 
  Send,
  Droplet
} from 'lucide-react';

export const EvidenceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<EvidenceDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [provenanceOpen, setProvenanceOpen] = useState<boolean>(false);

  // Question submission form state
  const [comment, setComment] = useState('');
  const [questionType, setQuestionType] = useState('ACCURACY');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getEvidenceDetail(id)
        .then((data) => setDetail(data))
        .catch((err) => console.error('Failed to load evidence detail', err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !id) return;
    setSubmitting(true);
    try {
      await api.createQuestion({
        evidence_type: detail?.source_type || 'composite',
        evidence_id: undefined,
        question_type: questionType,
        comment: comment.trim(),
      });
      setSubmitSuccess(true);
      setComment('');
      // Reload detail to show new question
      const updated = await api.getEvidenceDetail(id);
      setDetail(updated);
    } catch (err) {
      console.error('Failed to submit question', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content app-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading 12-factor evidence drill-down...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="page-content app-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ color: 'var(--status-poor)', marginBottom: '16px' }}>Evidence item not found.</div>
        <Link to="/evidence" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Evidence Explorer
        </Link>
      </div>
    );
  }

  return (
    <div className="page-content app-container" style={{ maxWidth: '1080px' }}>
      {/* Back button */}
      <Link to="/evidence" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--text-secondary)' }}>
        <ArrowLeft size={16} />
        <span>Back to Evidence Explorer</span>
      </Link>

      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-sky)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Evidence Item ID: {detail.id} &bull; {detail.source_type.toUpperCase()}
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px', marginBottom: '8px' }}>
              {detail.title}
            </h1>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Source: <strong>{detail.source_identity}</strong> &bull; Collected: {new Date(detail.collection_time).toLocaleString()} ({detail.age_description})
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setProvenanceOpen(true)}
              className="btn btn-secondary"
              style={{ gap: '6px', fontSize: '0.82rem' }}
            >
              <GitCommit size={15} /> Provenance Chain
            </button>
          </div>
        </div>

        {/* Claim Callout */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          borderLeft: '4px solid var(--accent-sky)',
          padding: '16px',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent-sky)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Core Environmental Claim (Question #1)
          </div>
          <div style={{ fontSize: '1.02rem', fontWeight: 600, color: '#ffffff', lineHeight: 1.5 }}>
            "{detail.claim}"
          </div>
        </div>

        {/* Simulation Disclaimer */}
        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {detail.simulation_disclaimer}
        </div>
      </div>

      {/* 12-Question Evidence Drill-down Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        
        {/* Q2 & Q3 & Q4: Source, Timing, Methodology */}
        <div className="grid-cols-2">
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Questions #2, #3: Source & Timing
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0 12px 0' }}>Who collected this and when?</h3>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Source Identity:</strong> {detail.source_identity}</div>
              <div><strong>Collection Timestamp:</strong> {new Date(detail.collection_time).toUTCString()}</div>
              <div><strong>Relative Freshness:</strong> <span className={`freshness-badge ${detail.freshness_status.toLowerCase()}`}>{detail.freshness_status} ({detail.age_description})</span></div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Question #4: Methodology
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0 12px 0' }}>How was this measured?</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {detail.methodology}
            </p>
          </div>
        </div>

        {/* Q5: Confidence & Factors */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Question #5: Confidence Model
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 16px 0' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>How confident are we in this evidence?</h3>
            <span style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              background: detail.confidence_level === 'HIGH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: detail.confidence_level === 'HIGH' ? '#34d399' : '#fbbf24',
              border: '1px solid currentColor',
            }}>
              {detail.confidence_level} Confidence ({Math.round(detail.confidence_score)}%)
            </span>
          </div>

          <div className="grid-cols-4">
            {Object.entries(detail.confidence_factors || {}).map(([factor, score]) => (
              <div key={factor} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{factor.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                  {typeof score === 'number' ? `${Math.round(score)}%` : String(score)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Q8: Rules & Thresholds Applied */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Question #8: Rule Engine & Boundary Checks
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '6px 0 16px 0' }}>What transparent rules were applied?</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {detail.rules_applied.map((rule, i) => (
              <li key={i} style={{
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.84rem',
                fontFamily: 'monospace',
                color: 'var(--text-highlight)',
                borderLeft: '3px solid var(--accent-cyan)',
              }}>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* Q6 & Q7: Supporting vs Conflicting Evidence */}
        <div className="grid-cols-2">
          {/* Supporting */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-good)', textTransform: 'uppercase' }}>
              Question #6: Corroborating Evidence
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0 12px 0' }}>What evidence supports this?</h3>
            {detail.supporting_evidence.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detail.supporting_evidence.map((sup, i) => (
                  <div key={i} style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#34d399' }}>{sup.source}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sup.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No direct corroborating stream required for single sensor.</div>
            )}
          </div>

          {/* Conflicting */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-concerning)', textTransform: 'uppercase' }}>
              Question #7: Conflicting Evidence
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0 12px 0' }}>Does any evidence disagree?</h3>
            {detail.conflicting_evidence.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detail.conflicting_evidence.map((conf, i) => (
                  <div key={i} style={{ padding: '10px', background: 'rgba(249, 115, 22, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#fb923c' }}>{conf.source}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{conf.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No conflicting environmental streams identified for this record.</div>
            )}
          </div>
        </div>

        {/* Q9 & Q11: Anomalies & Validation Records */}
        <div className="grid-cols-2">
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Question #9: Anomaly Screening
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0 12px 0' }}>Are there sensor or data faults?</h3>
            {detail.anomalies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detail.anomalies.map((anom, i) => (
                  <div key={i} style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#f87171' }}>{anom.type}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{anom.detail || 'Flagged by automated statistical anomaly engine'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.84rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> Passed all automated outlier and physical plausibility tests.
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Question #11: Ground-Truth Validation
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0 12px 0' }}>Has this been verified?</h3>
            {detail.validation_record ? (
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Status:</strong> <span style={{ color: '#34d399', fontWeight: 700 }}>{detail.validation_record.status}</span></div>
                {detail.validation_record.validator && <div><strong>Validator:</strong> {detail.validation_record.validator}</div>}
                {detail.validation_record.score && <div><strong>Validation Score:</strong> {detail.validation_record.score}/100</div>}
                {detail.validation_record.notes && <div><strong>Notes:</strong> {detail.validation_record.notes}</div>}
              </div>
            ) : (
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No manual validation record attached.</div>
            )}
          </div>
        </div>

        {/* Q12: Action Guidance / Water Conservation Link */}
        <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Droplet size={20} color="var(--accent-sky)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-sky)', textTransform: 'uppercase' }}>
              Question #12: Action Guidance
            </span>
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>What community action does this evidence call for?</h3>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {detail.action_guidance}
          </p>
        </div>

        {/* Q10: Community Challenges & Questioning Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <MessageSquare size={20} color="#fbbf24" />
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Question #10: Challenge & Question Workflow
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Question or Challenge this Evidence</h3>
            </div>
          </div>

          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
            Residents have the right to question any sensor or satellite finding. Submitting a challenge prompts field validation by our volunteer river monitors.
          </p>

          {/* Existing Questions on this Evidence */}
          {detail.questions && detail.questions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {detail.questions.map((q, i) => (
                <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span><strong>{q.user}</strong> asked:</span>
                    <span style={{ color: q.status === 'RESOLVED' ? '#34d399' : '#fbbf24', fontWeight: 700 }}>{q.status}</span>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#ffffff', marginBottom: q.response ? '8px' : '0' }}>
                    "{q.question}"
                  </div>
                  {q.response && (
                    <div style={{ padding: '8px 12px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-highlight)' }}>
                      <strong>Admin / Volunteer Response:</strong> {q.response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submission Form */}
          {submitSuccess ? (
            <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--status-good-border)', borderRadius: 'var(--radius-sm)', color: '#34d399', fontSize: '0.88rem', textAlign: 'center' }}>
              Your challenge has been recorded and submitted for environmental review.
            </div>
          ) : (
            <form onSubmit={handleQuestionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem',
                  }}
                >
                  <option value="ACCURACY">Challenge Accuracy (Reading doesn't match my sight)</option>
                  <option value="FRESHNESS">Challenge Freshness (Data is too old to trust)</option>
                  <option value="SOURCE_RELIABILITY">Source Reliability (Sensor appears faulty)</option>
                  <option value="INTERPRETATION">Clarification on Interpretation</option>
                  <option value="MISSING_DATA">Missing Factors or Parameters</option>
                  <option value="OTHER">Other Community Question</option>
                </select>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain why you question this evidence or describe what you observed locally..."
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
                  resize: 'vertical',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ fontSize: '0.84rem', padding: '8px 18px', gap: '6px' }}
                >
                  <Send size={14} />
                  <span>{submitting ? 'Submitting...' : 'Submit Challenge to River Team'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Provenance Modal */}
      <ProvenanceModal
        evidenceId={provenanceOpen ? detail.id : null}
        onClose={() => setProvenanceOpen(false)}
      />
    </div>
  );
};
