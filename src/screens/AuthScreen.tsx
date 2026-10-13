import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  supabase,
  isSupabaseConfigured,
  syncLocalDataToCloud,
  pullCloudDataToLocal,
  type SyncResult,
} from '../services/supabase';
import { getAllRides, getAllFuelEntries, getAllPlaces } from '../services/storage';
import {
  Cloud,
  ArrowLeft,
  LogIn,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Download,
  Database,
  Lock,
  Mail,
  HardDrive,
} from 'lucide-react';

export default function AuthScreen() {
  const { navigate } = useApp();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncResult | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [localCounts, setLocalCounts] = useState({ rides: 0, fuel: 0, places: 0 });

  useEffect(() => {
    // Check current session
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUserEmail(user?.email ?? null);
      });
    }

    // Load local storage counts
    Promise.all([getAllRides(), getAllFuelEntries(), getAllPlaces()]).then(([r, f, p]) => {
      setLocalCounts({ rides: r.length, fuel: f.length, places: p.length });
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setAuthError('Supabase is not configured in .env file.');
      return;
    }

    setLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: emailInput,
          password: passwordInput,
        });
        if (error) throw error;
        if (data.user) {
          setUserEmail(data.user.email ?? null);
          setAuthSuccess('Account created! You are now signed in.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailInput,
          password: passwordInput,
        });
        if (error) throw error;
        if (data.user) {
          setUserEmail(data.user.email ?? null);
          setAuthSuccess('Successfully signed in.');
        }
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signOut();
    setUserEmail(null);
    setSyncStatus(null);
    setLoading(false);
  };

  const handleSyncToCloud = async () => {
    setSyncing(true);
    const res = await syncLocalDataToCloud();
    setSyncStatus(res);
    setSyncing(false);
  };

  const handlePullFromCloud = async () => {
    setSyncing(true);
    const res = await pullCloudDataToLocal();
    if (res.error) {
      setSyncStatus({ success: false, syncedRides: 0, syncedFuelEntries: 0, syncedPlaces: 0, error: res.error });
    } else {
      setSyncStatus({
        success: true,
        syncedRides: res.pulledRides,
        syncedFuelEntries: res.pulledFuel,
        syncedPlaces: res.pulledPlaces,
      });
      // Refresh local counts
      const [r, f, p] = await Promise.all([getAllRides(), getAllFuelEntries(), getAllPlaces()]);
      setLocalCounts({ rides: r.length, fuel: f.length, places: p.length });
    }
    setSyncing(false);
  };

  const handleExportData = async () => {
    const [rides, fuel, places] = await Promise.all([getAllRides(), getAllFuelEntries(), getAllPlaces()]);
    const exportBundle = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      vehicle: 'Suzuki V-Strom SX 250',
      rides,
      fuelEntries: fuel,
      savedPlaces: places,
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vstrom-ride-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('settings')}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Cloud Sync & Account</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Offline-first architecture with optional Supabase cloud backup
          </div>
        </div>
      </div>

      {/* Offline First Guarantee Card */}
      <div
        className="card"
        style={{
          borderLeft: '4px solid var(--color-success)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--color-success)' }}>
          <HardDrive size={16} /> 100% Offline-First Cockpit
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
          Your motorcycle riding stats, GPS records, and fuel entries are stored locally in your browser's IndexedDB database. An account is completely optional and never required to ride.
        </div>
      </div>

      {/* Local Data Stats */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Database size={15} color="var(--color-accent)" /> Local Device Storage Status
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ background: 'var(--color-surface2)', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{localCounts.rides}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Saved Rides</div>
          </div>
          <div style={{ background: 'var(--color-surface2)', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-warn)' }}>{localCounts.fuel}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Fuel Logs</div>
          </div>
          <div style={{ background: 'var(--color-surface2)', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-nav-blue)' }}>{localCounts.places}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Saved Places</div>
          </div>
        </div>

        <button className="btn btn-ghost" onClick={handleExportData} style={{ marginTop: 4 }}>
          <Download size={15} /> Export Local Data (JSON Backup)
        </button>
      </div>

      {/* Supabase Connection Status */}
      {!isSupabaseConfigured ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-warn)' }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Supabase Cloud Unconfigured</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            To enable cloud backup across multiple devices, add your Supabase credentials to <code>.env</code>:
          </div>
          <pre style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 8, fontSize: 11, color: '#38bdf8', overflowX: 'auto' }}>
            VITE_SUPABASE_URL=https://your-project.supabase.co{'\n'}
            VITE_SUPABASE_ANON_KEY=your-anon-public-key
          </pre>
        </div>
      ) : userEmail ? (
        // Logged In Cloud Sync Card
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={14} /> CLOUD CONNECTED
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{userEmail}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={handleSignOut} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleSyncToCloud}
              disabled={syncing}
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync to Cloud'}
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={handlePullFromCloud}
              disabled={syncing}
            >
              <Cloud size={15} /> Pull Cloud Data
            </button>
          </div>

          {syncStatus && (
            <div
              style={{
                fontSize: 12,
                padding: 10,
                borderRadius: 8,
                background: syncStatus.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: syncStatus.success ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {syncStatus.success
                ? `Sync complete! Synced ${syncStatus.syncedRides} rides, ${syncStatus.syncedFuelEntries} fuel logs, and ${syncStatus.syncedPlaces} places.`
                : `Sync failed: ${syncStatus.error}`}
            </div>
          )}
        </div>
      ) : (
        // Sign In / Sign Up Form
        <form onSubmit={handleAuth} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cloud size={16} color="var(--color-accent)" />
            {isSignUp ? 'Create Cloud Account' : 'Sign In to Cloud Sync'}
          </div>

          <div>
            <label className="metric-label" style={{ display: 'block', marginBottom: 4 }}>Email Address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="email"
                required
                className="input"
                placeholder="rider@vstrom.org"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div>
            <label className="metric-label" style={{ display: 'block', marginBottom: 4 }}>Password</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="password"
                required
                minLength={6}
                className="input"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {isSignUp ? <Mail size={16} /> : <LogIn size={16} />}
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ fontSize: 12 }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>

          {authError && (
            <div style={{ color: 'var(--color-danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={14} /> {authError}
            </div>
          )}

          {authSuccess && (
            <div style={{ color: 'var(--color-success)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={14} /> {authSuccess}
            </div>
          )}
        </form>
      )}

      {/* Security & RLS Notice */}
      <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textAlign: 'center', padding: '6px 12px', lineHeight: 1.4 }}>
        <Lock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
        Security Guarantee: PostgreSQL Row-Level Security (RLS) ensures only you can read or write your motorcycle telemetry. No data is shared with third parties.
      </div>
    </div>
  );
}
