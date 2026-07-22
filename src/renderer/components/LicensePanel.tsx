import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';

interface LicenseInfo {
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  maxSessions: number;
  licenseKey: string | null;
  customerEmail: string | null;
  customerName: string | null;
  productName: string | null;
  expiresAt: string | null;
  isValid: boolean;
  lastValidated: string;
  instanceId: string | null;
}

const TIER_COLORS: Record<string, string> = {
  free: '#888',
  pro: '#00ffff',
  team: '#00ff88',
  enterprise: '#ff00ff'
};

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
  enterprise: 'Enterprise'
};

const SESSION_SLOT_OPTIONS = [4, 6, 8, 12, 20] as const;
const SLOT_DESCRIPTIONS: Record<number, string> = {
  4: '2×2 grid - Minimal, focused',
  6: '2×3 grid - Balanced',
  8: '2×4 grid - Default',
  12: '3×4 grid - Power user',
  20: '4×5 grid - Maximum capacity',
};

export const LicensePanel: React.FC = () => {
  const { sessionSlots, setSessionSlots } = useStore();
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load license on mount
  const loadLicense = useCallback(async () => {
    if (!window.flowrider?.license) {
      setLoading(false);
      return;
    }

    try {
      const result = await window.flowrider.license.get();
      if (result.success && result.license) {
        setLicense(result.license);
      }
    } catch (err) {
      console.error('[LicensePanel] Failed to load license:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLicense();
  }, [loadLicense]);

  // Activate license
  const handleActivate = async () => {
    if (!window.flowrider?.license || !licenseKeyInput.trim()) return;

    setActivating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.flowrider.license.activate(licenseKeyInput.trim());
      if (result.success && result.license) {
        setLicense(result.license);
        setLicenseKeyInput('');
        setSuccess('License activated successfully!');
      } else {
        setError(result.error || 'Failed to activate license');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed');
    }
    setActivating(false);
  };

  // Deactivate license
  const handleDeactivate = async () => {
    if (!window.flowrider?.license) return;

    if (!confirm('Are you sure you want to deactivate your license? You will revert to the Free tier.')) {
      return;
    }

    setActivating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.flowrider.license.deactivate();
      if (result.success) {
        await loadLicense();
        setSuccess('License deactivated. You are now on the Free tier.');
      } else {
        setError(result.error || 'Failed to deactivate license');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deactivation failed');
    }
    setActivating(false);
  };

  // Validate license
  const handleValidate = async () => {
    if (!window.flowrider?.license) return;

    setActivating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.flowrider.license.validate();
      if (result.success && result.license) {
        setLicense(result.license);
        setSuccess('License validated successfully!');
      } else {
        setError(result.error || 'License validation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    }
    setActivating(false);
  };

  if (loading) {
    return (
      <div className="license-panel" style={styles.panel}>
        <div style={styles.loading}>Loading license info...</div>
      </div>
    );
  }

  const tierColor = license ? TIER_COLORS[license.tier] || '#888' : '#888';
  const tierLabel = license ? TIER_LABELS[license.tier] || 'Unknown' : 'Unknown';

  return (
    <div className="license-panel" style={styles.panel}>
      <h2 style={styles.title}>License</h2>

      {/* Current License Status */}
      <div style={styles.statusCard}>
        <div style={styles.tierBadge}>
          <span style={{ ...styles.tierDot, backgroundColor: tierColor }}></span>
          <span style={{ ...styles.tierName, color: tierColor }}>{tierLabel}</span>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.stat}>
            <span style={styles.statValue}>{license?.maxSessions || 3}</span>
            <span style={styles.statLabel}>Max Sessions</span>
          </div>
          <div style={styles.stat}>
            <span style={{ ...styles.statValue, color: license?.isValid ? '#00ff88' : '#ff4444' }}>
              {license?.isValid ? 'Valid' : 'Invalid'}
            </span>
            <span style={styles.statLabel}>Status</span>
          </div>
        </div>

        {license?.customerEmail && (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email:</span>
            <span style={styles.infoValue}>{license.customerEmail}</span>
          </div>
        )}

        {license?.productName && (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Product:</span>
            <span style={styles.infoValue}>{license.productName}</span>
          </div>
        )}

        {license?.expiresAt && (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Expires:</span>
            <span style={styles.infoValue}>
              {new Date(license.expiresAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {license?.lastValidated && (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Last Validated:</span>
            <span style={styles.infoValue}>
              {new Date(license.lastValidated).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Feedback Messages */}
      {error && (
        <div style={styles.error}>{error}</div>
      )}
      {success && (
        <div style={styles.success}>{success}</div>
      )}

      {/* License Actions */}
      {license?.tier === 'free' ? (
        <div style={styles.activateSection}>
          <h3 style={styles.sectionTitle}>Activate License</h3>
          <p style={styles.hint}>
            Enter your license key to unlock more sessions.
          </p>
          <input
            type="text"
            value={licenseKeyInput}
            onChange={(e) => setLicenseKeyInput(e.target.value)}
            placeholder="Enter license key (e.g., XXXXXX-XXXXXX-XXXXXX-XXXXXX)"
            style={styles.input}
            disabled={activating}
          />
          <button
            onClick={handleActivate}
            disabled={activating || !licenseKeyInput.trim()}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: activating || !licenseKeyInput.trim() ? 0.5 : 1
            }}
          >
            {activating ? 'Activating...' : 'Activate License'}
          </button>

          <div style={styles.upgradeSection}>
            <p style={styles.upgradeText}>
              Need a license? Get one at{' '}
              <a
                href="https://flowrider.dev"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
              >
                flowrider.dev
              </a>
            </p>
          </div>
        </div>
      ) : (
        <div style={styles.actionsSection}>
          <h3 style={styles.sectionTitle}>License Actions</h3>
          <div style={styles.buttonRow}>
            <button
              onClick={handleValidate}
              disabled={activating}
              style={{
                ...styles.button,
                ...styles.secondaryButton,
                opacity: activating ? 0.5 : 1
              }}
            >
              {activating ? 'Validating...' : 'Validate License'}
            </button>
            <button
              onClick={handleDeactivate}
              disabled={activating}
              style={{
                ...styles.button,
                ...styles.dangerButton,
                opacity: activating ? 0.5 : 1
              }}
            >
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* Tier Comparison */}
      <div style={styles.tierComparison}>
        <h3 style={styles.sectionTitle}>Plan Comparison</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tier</th>
              <th style={styles.th}>Sessions</th>
              <th style={styles.th}>Price</th>
            </tr>
          </thead>
          <tbody>
            <tr style={license?.tier === 'free' ? styles.currentTierRow : {}}>
              <td style={{ ...styles.td, color: TIER_COLORS.free }}>Free</td>
              <td style={styles.td}>3</td>
              <td style={styles.td}>$0</td>
            </tr>
            <tr style={license?.tier === 'pro' ? styles.currentTierRow : {}}>
              <td style={{ ...styles.td, color: TIER_COLORS.pro }}>Pro</td>
              <td style={styles.td}>20</td>
              <td style={styles.td}>$19/mo</td>
            </tr>
            <tr style={license?.tier === 'team' ? styles.currentTierRow : {}}>
              <td style={{ ...styles.td, color: TIER_COLORS.team }}>Team</td>
              <td style={styles.td}>100</td>
              <td style={styles.td}>$49/mo</td>
            </tr>
            <tr style={license?.tier === 'enterprise' ? styles.currentTierRow : {}}>
              <td style={{ ...styles.td, color: TIER_COLORS.enterprise }}>Enterprise</td>
              <td style={styles.td}>400</td>
              <td style={styles.td}>Contact us</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Display Settings */}
      <div style={styles.displaySettings}>
        <h3 style={styles.sectionTitle}>Display Settings</h3>
        <p style={styles.hint}>
          Choose how many session slots to display. Fewer slots means less cognitive load.
        </p>
        <div style={styles.slotButtonGroup}>
          {SESSION_SLOT_OPTIONS.map((slots) => (
            <button
              key={slots}
              onClick={() => setSessionSlots(slots)}
              style={{
                ...styles.slotButton,
                ...(sessionSlots === slots ? styles.slotButtonActive : {}),
              }}
              title={SLOT_DESCRIPTIONS[slots]}
            >
              <span style={styles.slotNumber}>{slots}</span>
              <span style={styles.slotDesc}>{SLOT_DESCRIPTIONS[slots].split(' - ')[0]}</span>
            </button>
          ))}
        </div>
        <p style={styles.slotHint}>
          Current: {sessionSlots} sessions ({SLOT_DESCRIPTIONS[sessionSlots]?.split(' - ')[1] || 'Custom'})
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '24px',
    color: '#fff',
    fontFamily: 'monospace',
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#00ffff',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: '40px',
  },
  statusCard: {
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  tierBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  tierDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  tierName: {
    fontSize: '20px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#00ffff',
  },
  statLabel: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    color: '#888',
  },
  infoValue: {
    color: '#fff',
  },
  error: {
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid #ff4444',
    borderRadius: '4px',
    padding: '12px',
    color: '#ff4444',
    marginBottom: '16px',
  },
  success: {
    background: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid #00ff88',
    borderRadius: '4px',
    padding: '12px',
    color: '#00ff88',
    marginBottom: '16px',
  },
  activateSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '12px',
  },
  hint: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '12px',
  },
  input: {
    width: '100%',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '4px',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryButton: {
    background: '#00ffff',
    color: '#000',
    fontWeight: 'bold',
    width: '100%',
  },
  secondaryButton: {
    background: 'transparent',
    border: '1px solid #00ffff',
    color: '#00ffff',
  },
  dangerButton: {
    background: 'transparent',
    border: '1px solid #ff4444',
    color: '#ff4444',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
  },
  actionsSection: {
    marginBottom: '24px',
  },
  upgradeSection: {
    marginTop: '16px',
    padding: '16px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    textAlign: 'center',
  },
  upgradeText: {
    fontSize: '14px',
    color: '#888',
    margin: 0,
  },
  link: {
    color: '#00ffff',
    textDecoration: 'none',
  },
  tierComparison: {
    marginTop: '24px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#888',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  currentTierRow: {
    background: 'rgba(0, 255, 255, 0.1)',
  },
  displaySettings: {
    marginTop: '32px',
    padding: '20px',
    background: 'rgba(147, 51, 234, 0.05)',
    border: '1px solid rgba(147, 51, 234, 0.2)',
    borderRadius: '8px',
  },
  slotButtonGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginTop: '12px',
  },
  slotButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '12px 16px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(147, 51, 234, 0.3)',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '60px',
  },
  slotButtonActive: {
    background: 'rgba(147, 51, 234, 0.2)',
    border: '1px solid rgba(147, 51, 234, 0.6)',
    color: '#9333ea',
    boxShadow: '0 0 10px rgba(147, 51, 234, 0.3)',
  },
  slotNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  slotDesc: {
    fontSize: '10px',
    opacity: 0.8,
  },
  slotHint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '12px',
    textAlign: 'center' as const,
  },
};

export default LicensePanel;
