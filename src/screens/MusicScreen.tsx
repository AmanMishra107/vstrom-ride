import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FolderPlus,
  Trash2,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Music,
  Disc3,
  Sparkles,
} from 'lucide-react';
import ModuleHeader from '../components/ModuleHeader';
import {
  getAllLocalTracks,
  saveLocalTrack,
  deleteLocalTrack,
  type LocalTrack,
} from '../services/audioStorage';
import { generateId } from '../utils/idUtils';
import { formatDuration } from '../utils/gpsUtils';

export default function MusicScreen() {
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingTracks, setLoadingTracks] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved tracks from IndexedDB on mount
  useEffect(() => {
    getAllLocalTracks().then((loaded) => {
      setTracks(loaded);
      setLoadingTracks(false);
    });
  }, []);

  const currentTrack: LocalTrack | undefined = tracks[currentIndex];

  // Revoke previous object URL and create a new one when track changes
  useEffect(() => {
    if (!currentTrack) {
      setAudioUrl(null);
      return;
    }

    const url = URL.createObjectURL(currentTrack.blob);
    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [currentTrack]);

  // Sync MediaSession metadata for Bluetooth helmet intercoms & lock screen
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'V-Strom Ride OS Phone Library',
        album: 'Cockpit Audio',
        artwork: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrevious();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNext();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    } catch {
      // Ignored if browser mediaSession is restricted
    }
  }, [currentTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play / Pause toggle
  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('Audio play failed:', err);
      });
    }
  };

  // Next track logic
  const handleNext = useCallback(() => {
    if (tracks.length === 0) return;

    if (isShuffle && tracks.length > 1) {
      let rand = Math.floor(Math.random() * tracks.length);
      if (rand === currentIndex) rand = (rand + 1) % tracks.length;
      setCurrentIndex(rand);
    } else {
      setCurrentIndex((prev) => (prev + 1) % tracks.length);
    }
  }, [tracks.length, isShuffle, currentIndex]);

  // Previous track logic
  const handlePrevious = useCallback(() => {
    if (tracks.length === 0) return;

    // If more than 3 seconds in, restart track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  // When track ends
  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else if (repeatMode === 'all' || isShuffle) {
      handleNext();
    } else {
      // 'off'
      if (currentIndex < tracks.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsPlaying(false);
      }
    }
  };

  // Handle files selected from phone storage
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTracks: LocalTrack[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rawName = file.name.replace(/\.[^/.]+$/, ''); // Strip extension
      let artist = 'Local Audio';
      let title = rawName;

      // Parse common "Artist - Title" filename format
      if (rawName.includes(' - ')) {
        const parts = rawName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      const track: LocalTrack = {
        id: generateId(),
        name: file.name,
        title,
        artist,
        blob: file,
        size: file.size,
        type: file.type || 'audio/mpeg',
        addedAt: Date.now() + i,
      };

      await saveLocalTrack(track);
      newTracks.push(track);
    }

    setTracks((prev) => [...prev, ...newTracks]);
    if (tracks.length === 0 && newTracks.length > 0) {
      setCurrentIndex(0);
    }

    // Reset input so same file can be re-added if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove track
  const handleDeleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteLocalTrack(id);
    const updated = tracks.filter((t) => t.id !== id);
    setTracks(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
  };

  // Play synthesized demo motorcycle riding beat
  const playSynthesizedDemo = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const sampleRate = ctx.sampleRate;
      const durationSec = 4;
      const buffer = ctx.createBuffer(2, sampleRate * durationSec, sampleRate);

      // Generate a motorcycle rhythm loop
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const bass = Math.sin(2 * Math.PI * 65 * t) * Math.exp(-((t % 0.5) * 8));
          const engine = Math.sin(2 * Math.PI * (110 + 20 * Math.sin(2 * Math.PI * 4 * t)) * t) * 0.15;
          const snare = ((Math.random() * 2 - 1) * Math.exp(-(((t + 0.25) % 0.5) * 20))) * 0.25;
          data[i] = (bass + engine + snare) * 0.7;
        }
      }

      // Convert buffer to wav blob
      const wavBlob = audioBufferToWav(buffer);
      const demoTrack: LocalTrack = {
        id: generateId(),
        name: 'V-Strom Adventure Beat.wav',
        title: 'V-Strom SX Synth Beat',
        artist: 'Suzuki Motorsport Audio',
        blob: wavBlob,
        size: wavBlob.size,
        type: 'audio/wav',
        duration: 4,
        addedAt: Date.now(),
      };

      saveLocalTrack(demoTrack).then(() => {
        setTracks((prev) => [demoTrack, ...prev]);
        setCurrentIndex(0);
      });
    } catch (err) {
      console.warn('Demo synth failed:', err);
    }
  };

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac"
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />

      {/* HTML5 Audio Engine */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration || 0);
              audioRef.current.volume = isMuted ? 0 : volume;
            }
          }}
          onEnded={handleEnded}
        />
      )}

      {/* Header */}
      <ModuleHeader
        title="Motorcycle Music Player"
        subtitle="Access and play MP3 audio files directly from your phone"
        fallbackScreen="cockpit"
        rightAction={
          <button
            className="btn btn-primary btn-icon"
            onClick={() => fileInputRef.current?.click()}
            title="Import Songs from Phone"
            style={{ width: 44, height: 44 }}
          >
            <FolderPlus size={18} />
          </button>
        }
      />

      {/* Main Player Card */}
      {currentTrack ? (
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '18px 14px',
            gap: 14,
            background: 'var(--color-surface)',
            boxShadow: 'var(--neu-shadow-out)',
          }}
        >
          {/* Animated Album / Motorcycle Disc Visualizer */}
          <div
            style={{
              position: 'relative',
              width: 130,
              height: 130,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #1e1e24 20%, #111114 60%, #08080a 100%)',
              border: '3px solid var(--color-border-bright)',
              boxShadow: isPlaying
                ? '0 0 24px var(--color-accent-glow), var(--neu-shadow-btn)'
                : 'var(--neu-shadow-btn)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isPlaying ? 'spin 12s linear infinite' : 'none',
            }}
          >
            <Disc3
              size={64}
              color={isPlaying ? 'var(--color-accent)' : 'var(--color-text-dim)'}
              style={{ transition: 'color 0.3s ease' }}
            />
            <div
              style={{
                position: 'absolute',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--color-bg)',
                border: '2px solid var(--color-border)',
              }}
            />
          </div>

          {/* Track Info */}
          <div style={{ textAlign: 'center', width: '100%', padding: '0 8px' }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 17,
                color: 'var(--color-text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={currentTrack.title}
            >
              {currentTrack.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-muted)',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentTrack.artist}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>
              Track {currentIndex + 1} of {tracks.length}
            </div>
          </div>

          {/* Progress / Seek Slider */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentTime(val);
                if (audioRef.current) audioRef.current.currentTime = val;
              }}
              style={{
                width: '100%',
                accentColor: 'var(--color-accent)',
                cursor: 'pointer',
                height: 6,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              <span>{formatDuration(Math.floor(currentTime))}</span>
              <span>{formatDuration(Math.floor(duration))}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            {/* Shuffle */}
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setIsShuffle(!isShuffle)}
              title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
              style={{
                width: 38,
                height: 38,
                color: isShuffle ? 'var(--color-accent)' : 'var(--color-text-dim)',
              }}
            >
              <Shuffle size={16} />
            </button>

            {/* Skip Previous */}
            <button
              className="btn btn-ghost btn-icon"
              onClick={handlePrevious}
              title="Previous Track"
              style={{ width: 44, height: 44 }}
            >
              <SkipBack size={20} />
            </button>

            {/* Play / Pause */}
            <button
              className="btn btn-primary"
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              style={{
                width: 62,
                height: 62,
                borderRadius: '50%',
                padding: 0,
                boxShadow: isPlaying
                  ? '0 0 20px var(--color-accent-glow), var(--neu-shadow-btn)'
                  : 'var(--neu-shadow-btn)',
              }}
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 3 }} />}
            </button>

            {/* Skip Next */}
            <button
              className="btn btn-ghost btn-icon"
              onClick={handleNext}
              title="Next Track"
              style={{ width: 44, height: 44 }}
            >
              <SkipForward size={20} />
            </button>

            {/* Repeat Mode */}
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => {
                const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
                setRepeatMode(next);
              }}
              title={`Repeat: ${repeatMode}`}
              style={{
                width: 38,
                height: 38,
                color: repeatMode !== 'off' ? 'var(--color-accent)' : 'var(--color-text-dim)',
              }}
            >
              {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>

          {/* Volume Control Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 260, padding: '4px 8px' }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (audioRef.current) audioRef.current.volume = nextMuted ? 0 : volume;
              }}
              style={{ width: 32, height: 32, flexShrink: 0 }}
            >
              {isMuted || volume === 0 ? <VolumeX size={15} color="var(--color-danger)" /> : <Volume2 size={15} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                setIsMuted(false);
                if (audioRef.current) audioRef.current.volume = val;
              }}
              style={{ flex: 1, accentColor: 'var(--color-accent)', cursor: 'pointer', height: 4 }}
            />
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '28px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--color-surface2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--neu-shadow-in)',
            }}
          >
            <Music size={34} color="var(--color-accent)" />
          </div>

          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--color-text)' }}>
              No Music Loaded Yet
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4, maxWidth: 300, lineHeight: 1.4 }}>
              Select audio tracks (MP3, M4A, WAV, FLAC) from your phone storage. They persist offline in your cockpit library.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280, marginTop: 4 }}>
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              style={{ gap: 8 }}
            >
              <FolderPlus size={18} /> Choose Music from Phone
            </button>

            <button
              className="btn btn-ghost"
              onClick={playSynthesizedDemo}
              style={{ gap: 6, fontSize: 12 }}
            >
              <Sparkles size={14} color="var(--color-warn)" /> Play Demo Moto Beat
            </button>
          </div>
        </div>
      )}

      {/* Playlist / Library Section */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Phone Audio Playlist</span>
            <span style={{ fontSize: 11, background: 'var(--color-surface2)', padding: '2px 8px', borderRadius: 10, color: 'var(--color-text-muted)' }}>
              {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
            </span>
          </div>

          <button
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: 11, padding: '4px 10px', minHeight: 32, gap: 4 }}
          >
            <FolderPlus size={14} /> Add Songs
          </button>
        </div>

        {loadingTracks ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
            Loading library…
          </div>
        ) : tracks.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
            Your playlist is empty. Tap <strong>Add Songs</strong> to load audio files from your device.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
            {tracks.map((t, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsPlaying(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-surface2)' : 'transparent',
                    border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Track number or active equalizer */}
                  <div style={{ width: 22, textAlign: 'center', fontSize: 12, fontFamily: 'var(--font-mono)', color: isSelected ? 'var(--color-accent)' : 'var(--color-text-dim)', flexShrink: 0 }}>
                    {isSelected && isPlaying ? '▶' : `${idx + 1}`}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.artist}
                    </div>
                  </div>

                  {/* Delete track button */}
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => handleDeleteTrack(t.id, e)}
                    title="Remove from playlist"
                    style={{ width: 28, height: 28, flexShrink: 0, opacity: 0.6 }}
                  >
                    <Trash2 size={13} color="var(--color-danger)" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Convert AudioBuffer to standard WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  out.setUint32(0, 0x46464952, true); // "RIFF"
  out.setUint32(4, length - 8, true);
  out.setUint32(8, 0x45564157, true); // "WAVE"
  out.setUint32(12, 0x20746d66, true); // "fmt "
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); // PCM
  out.setUint16(22, numOfChan, true);
  out.setUint32(24, buffer.sampleRate, true);
  out.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
  out.setUint16(32, numOfChan * 2, true);
  out.setUint16(34, 16, true);
  out.setUint32(36, 0x61746164, true); // "data"
  out.setUint32(40, length - pos - 4, true);
  pos = 44;

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      setUint16(sample);
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}
