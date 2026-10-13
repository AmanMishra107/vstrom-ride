import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  X,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface MobileConnectModalProps {
  onClose: () => void;
}

export default function MobileConnectModal({ onClose }: MobileConnectModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isHttpsMode, setIsHttpsMode] = useState(false);

  // Determine current IP/host
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  const lanIp = hostname === 'localhost' || hostname === '127.0.0.1' ? '192.168.29.122' : hostname;

  const httpUrl = `http://${lanIp}${port || ':5173'}`;
  const httpsUrl = `https://${lanIp}:5173`;
  const activeUrl = isHttpsMode ? httpsUrl : httpUrl;

  useEffect(() => {
    QRCode.toDataURL(activeUrl, {
      margin: 1,
      width: 220,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [activeUrl]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card fade-in"
        style={{
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 18,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-bright)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Smartphone size={18} color="var(--color-accent)" />
            Open on Motorcycle Phone
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Protocol Selector Tabs */}
        <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 8, padding: 3 }}>
          <button
            onClick={() => setIsHttpsMode(false)}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: 6,
              background: !isHttpsMode ? 'var(--color-accent)' : 'transparent',
              color: !isHttpsMode ? '#ffffff' : 'var(--color-text-muted)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            HTTP (Standard)
          </button>
          <button
            onClick={() => setIsHttpsMode(true)}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: 6,
              background: isHttpsMode ? 'var(--color-accent)' : 'transparent',
              color: isHttpsMode ? '#ffffff' : 'var(--color-text-muted)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            HTTPS (Native Mobile GPS)
          </button>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#ffffff',
              padding: 12,
              borderRadius: 12,
              alignSelf: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
          >
            <img src={qrDataUrl} alt="Mobile QR Code" width={180} height={180} />
          </div>
        )}

        {/* IP URL Box */}
        <div
          style={{
            background: 'var(--color-surface2)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              {isHttpsMode ? 'Secure Mobile URL' : 'Local Wi-Fi IP URL'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--color-accent)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeUrl}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => copyToClipboard(activeUrl)}
            title="Copy URL"
          >
            {copied ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Mobile GPS Security Advisory */}
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#60a5fa', fontWeight: 700 }}>
            <ShieldCheck size={14} /> GPS on Mobile Phone:
          </div>
          <div>
            {isHttpsMode ? (
              <span>
                Run <code style={{ color: '#38bdf8' }}>npm run dev:https</code> to start the HTTPS dev server. Your phone can then access native GPS hardware.
              </span>
            ) : (
              <span>
                For plain HTTP, Android Chrome blocks GPS by default. To unblock: in Chrome go to{' '}
                <code style={{ fontSize: 10, color: '#facc15' }}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>{' '}
                and add <code style={{ fontSize: 10, color: '#38bdf8' }}>{httpUrl}</code>.
              </span>
            )}
          </div>
        </div>

        {/* PWA Home Screen tip */}
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textAlign: 'center' }}>
          💡 On mobile: Tap browser menu <strong style={{ color: 'var(--color-text)' }}>⋮</strong> →{' '}
          <strong style={{ color: 'var(--color-text)' }}>Add to Home Screen</strong> for full-screen motorcycle cockpit!
        </div>
      </div>
    </div>
  );
}
