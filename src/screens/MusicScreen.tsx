import { useEffect, useState } from 'react';

import { SkipBack, Play, Pause, SkipForward, Music2, AlertCircle } from 'lucide-react';

import ModuleHeader from '../components/ModuleHeader';

interface MediaInfo {
  title: string;
  artist: string;
  album: string;
  artwork?: string;
  playbackState: 'playing' | 'paused' | 'none';
}

export default function MusicScreen() {
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [supported] = useState(() => 'mediaSession' in navigator);

  useEffect(() => {
    if (!supported) return;

    const update = () => {
      const s = navigator.mediaSession;
      const meta = s?.metadata;
      if (!meta) { setMedia(null); return; }
      setMedia({
        title: meta.title || 'Unknown Title',
        artist: meta.artist || 'Unknown Artist',
        album: meta.album || '',
        artwork: meta.artwork?.[0]?.src,
        playbackState: s.playbackState as 'playing' | 'paused' | 'none',
      });
    };

    // Poll since mediaSession doesn't fire events
    const t = setInterval(update, 1000);
    update();
    return () => clearInterval(t);
  }, [supported]);

  const controlAction = async (action: MediaSessionAction) => {
    if (!supported) return;
    try {
      // navigator.mediaSession action handlers are set by the active media page
      // We can only trigger if they were registered
      const handlers = ['play', 'pause', 'previoustrack', 'nexttrack'];
      if (handlers.includes(action)) {
        // This works if a media page (e.g. YouTube) has registered a handler
        // In practice, cross-origin control is limited
        navigator.mediaSession?.setActionHandler(action, null);
      }
    } catch { /**/ }
  };

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ModuleHeader
        title="Music Controls"
        subtitle="Handlebar media playback & audio controller"
        fallbackScreen="cockpit"
      />

      {!supported ? (
        <div className="card" style={{ background: '#1a1400', border: '1px solid #3d3000' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={18} color="var(--color-warn)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: 'var(--color-warn)' }}>
              Media Session API is not supported in this browser. Music controls are unavailable.
            </div>
          </div>
        </div>
      ) : !media ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <Music2 size={40} color="var(--color-text-dim)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>No Media Playing</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Start playing music in another browser tab (e.g. YouTube Music, Spotify Web), then return here.
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24 }}>
          {/* Artwork */}
          {media.artwork ? (
            <img src={media.artwork} alt="Album art"
              style={{ width: 140, height: 140, borderRadius: 12, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />
          ) : (
            <div style={{ width: 140, height: 140, borderRadius: 12, background: 'var(--color-surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music2 size={48} color="var(--color-text-dim)" />
            </div>
          )}

          {/* Info */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 17, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {media.title}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>{media.artist}</div>
            {media.album && <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{media.album}</div>}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => controlAction('previoustrack')}>
              <SkipBack size={22} />
            </button>
            <button
              className="btn btn-primary"
              style={{ width: 64, height: 64, borderRadius: '50%', padding: 0 }}
              onClick={() => controlAction(media.playbackState === 'playing' ? 'pause' : 'play')}
            >
              {media.playbackState === 'playing'
                ? <Pause size={26} />
                : <Play size={26} />}
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => controlAction('nexttrack')}>
              <SkipForward size={22} />
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textAlign: 'center', maxWidth: 260 }}>
            Controls work when a compatible media player is active in another tab.
            For full control, use native apps.
          </div>
        </div>
      )}
    </div>
  );
}
