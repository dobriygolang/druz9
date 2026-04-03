import React, { useState } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { usePodcast } from '@/app/providers/PodcastProvider';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

export const PodcastPlayer: React.FC = () => {
  const {
    currentPodcast, isPlaying, progress, duration,
    togglePlay, seek, closePlayer, playbackRate, setPlaybackRate
  } = usePodcast();
  const isMobile = useIsMobile();
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

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      className="fade-in podcast-player"
      style={{
        position: 'fixed',
        bottom: isMobile ? '84px' : '80px',
        left: isMobile ? '8px' : '20px',
        right: isMobile ? '8px' : '20px',
        zIndex: 50,
        backgroundColor: 'rgba(24, 24, 27, 0.98)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: isMobile ? '16px' : '24px',
        padding: isMobile ? '10px 14px' : '12px 24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        gap: isMobile ? '8px' : '20px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        width: isMobile ? '100%' : 'auto',
        minWidth: isMobile ? '0' : '200px' 
      }}>
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
          style={{
            width: isMobile ? '40px' : '48px',
            height: isMobile ? '40px' : '48px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-color), #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            border: 'none',
            flexShrink: 0,
          }}
          className="hover-scale"
        >
          {isPlaying ? (
            <Pause size={isMobile ? 18 : 20} color="white" fill="white" />
          ) : (
            <Play size={isMobile ? 18 : 20} color="white" fill="white" />
          )}
        </button>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: isMobile ? '13px' : '14px', 
            whiteSpace: 'nowrap', 
            textOverflow: 'ellipsis', 
            overflow: 'hidden' 
          }}>
            {currentPodcast.title}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {currentPodcast.author_name}
          </div>
        </div>
        {isMobile && (
          <button
            onClick={closePlayer}
            aria-label="Закрыть плеер"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        width: isMobile ? '100%' : 'auto'
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '30px' }}>{formatTime(progress)}</span>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            style={{
              width: '100%',
              height: '4px',
              borderRadius: '2px',
              appearance: 'none',
              background: `linear-gradient(to right, var(--accent-color) ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%)`,
              cursor: 'pointer',
              outline: 'none',
            }}
          />
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '30px' }}>{formatTime(duration)}</span>
        {!isMobile && (
          <div 
            onMouseEnter={() => setIsSpeedHovered(true)}
            onMouseLeave={() => setIsSpeedHovered(false)}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px' }}
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
                  {(playbackRate || 1).toFixed(1)}x
                </div>
              </div>
            )}
            <div 
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                padding: '4px 8px', 
                borderRadius: '8px', 
                color: 'white', 
                fontSize: '11px', 
                fontWeight: '700',
                cursor: 'default',
                minWidth: '38px',
                textAlign: 'center'
              }}
            >
              {(playbackRate || 1).toFixed(1)}x
            </div>
          </div>
        )}
      </div>

      {!isMobile && (
        <button
          onClick={closePlayer}
          aria-label="Закрыть плеер"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
};
