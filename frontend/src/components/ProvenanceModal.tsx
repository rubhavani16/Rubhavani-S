import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ProvenanceChain } from '../types';
import { 
  X, 
  GitCommit 
} from 'lucide-react';

interface ProvenanceModalProps {
  evidenceId: string | null;
  onClose: () => void;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({ evidenceId, onClose }) => {
  const [chain, setChain] = useState<ProvenanceChain | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (evidenceId) {
      setLoading(true);
      api.getProvenanceChain(evidenceId)
        .then((data) => setChain(data))
        .catch((err) => console.error('Failed to load provenance chain', err))
        .finally(() => setLoading(false));
    }
  }, [evidenceId]);

  if (!evidenceId) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 210,
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
          maxWidth: '680px',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '32px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitCommit size={20} color="var(--accent-sky)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Evidence Provenance Chain</h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Immutable audit path for Evidence ID: <code>{evidenceId}</code>
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Verifying cryptographic signatures and assembling provenance stages...
          </div>
        ) : chain ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
            {chain.steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                {/* Timeline connector */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.2)',
                    border: '2px solid var(--accent-sky)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-sky)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}>
                    {idx + 1}
                  </div>
                  {idx < chain.steps.length - 1 && (
                    <div style={{
                      width: '2px',
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.1)',
                      margin: '6px 0',
                    }} />
                  )}
                </div>

                {/* Step Content */}
                <div className="glass-panel" style={{ flex: 1, padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>
                      {step.stage}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}>
                      {step.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {step.description}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    paddingTop: '6px',
                  }}>
                    <span><strong>Agent:</strong> {step.agent}</span>
                    <span><strong>Action:</strong> {step.action}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--status-poor)' }}>
            Unable to trace provenance chain for this evidence item.
          </div>
        )}
      </div>
    </div>
  );
};
