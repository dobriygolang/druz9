import React, { useState } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { usePodcast } from '@/app/providers/PodcastProvider';

export const PodcastPlayer: React.FC = () => {
  const { 
    currentPodcast, isPlaying, progress, duration, 
    togglePlay, seek, closePlayer, playbackRate, setPlaybackRate 
  } = usePodcast();

  const [isSpeedHovered, setIsSpeedHovered] = useState(false);

  if (!currentPodcast) return null;

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        bottom: '80px', 
        left: '20px',
        right: '20px',
        zIndex: 50,
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '200px' }}>
        <div 
          onClick={togglePlay}
          style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, var(--accent-color), #818cf8)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          className="hover-scale"
        >
          {isPlaying ? (
            <Pause size={20} color="white" fill="white" />
          ) : (
            <Play size={20} color="white" fill="white" />
          )}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {currentPodcast.title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {currentPodcast.author_name}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '35px' }}>{formatTime(progress)}</span>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            style={{
              width: '100%',
              height: '4px',
              borderRadius: '2px',
              appearance: 'none',
              background: `linear-gradient(to right, var(--accent-color) ${(progress / duration) * 100 || 0}%, rgba(255,255,255,0.1) ${(progress / duration) * 100 || 0}%)`,
              cursor: 'pointer',
              outline: 'none',
            }}
          />
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '35px' }}>{formatTime(duration)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div 
          onMouseEnter={() => setIsSpeedHovered(true)}
          onMouseLeave={() => setIsSpeedHovered(false)}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isSpeedHovered && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 6px',
              backgroundColor: 'rgba(24, 24, 27, 0.95)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '10px',
              height: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 100,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)'
            }}>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                style={{
                  WebkitAppearance: 'slider-vertical',
                  width: '12px',
                  height: '100%',
                  background: 'transparent',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ fontSize: '10px', marginTop: '8px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                {playbackRate.toFixed(1)}x
              </div>
            </div>
          )}
          <div 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              padding: '6px 12px', 
              borderRadius: '10px', 
              color: 'white', 
              fontSize: '13px', 
              fontWeight: '700',
              cursor: 'default',
              minWidth: '50px',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}
          >
            {playbackRate.toFixed(1)}x
          </div>
        </div>

        <button 
          onClick={closePlayer}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
