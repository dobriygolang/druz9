import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Podcast } from '@/entities/User/model/types';
import { podcastApi } from '@/features/Podcast/api/podcastApi';

interface PodcastContextType {
  currentPodcast: Podcast | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  playPodcast: (podcast: Podcast) => Promise<void>;
  togglePlay: () => void;
  seek: (time: number) => void;
  closePlayer: () => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
}

const PodcastContext = createContext<PodcastContextType | undefined>(undefined);

export const PodcastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      if (isClosingRef.current) return;
      setIsPlaying(false);
      console.error('Podcast audio playback error');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const playPodcast = async (podcast: Podcast) => {
    if (currentPodcast?.id === podcast.id) {
      togglePlay();
      return;
    }

    try {
      const { streamUrl } = await podcastApi.play(podcast.id);
      if (audioRef.current) {
        if (!streamUrl) {
          throw new Error('empty stream url');
        }
        audioRef.current.src = streamUrl;
        await audioRef.current.play();
        setCurrentPodcast(podcast);
        setIsPlaying(true);
      }
    } catch (err) {
      setIsPlaying(false);
      console.error('Failed to play podcast', err);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentPodcast) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const closePlayer = () => {
    if (audioRef.current) {
      isClosingRef.current = true;
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      queueMicrotask(() => {
        isClosingRef.current = false;
      });
    }
    setCurrentPodcast(null);
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <PodcastContext.Provider value={{ 
      currentPodcast, 
      isPlaying, 
      progress, 
      duration, 
      playPodcast, 
      togglePlay, 
      seek, 
      closePlayer,
      playbackRate,
      setPlaybackRate
    }}>
      {children}
    </PodcastContext.Provider>
  );
};

export const usePodcast = () => {
  const context = useContext(PodcastContext);
  if (!context) throw new Error('usePodcast must be used within a PodcastProvider');
  return context;
};
