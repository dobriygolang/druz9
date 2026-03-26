import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  Mic,
  MicOff,
  PauseCircle,
  PlayCircle,
  Radio,
  RefreshCcw,
  Users,
  Video,
  Volume2,
} from 'lucide-react';
import ReactPlayer from 'react-player';
import { ConnectionState, Room as LiveKitRoom, RoomEvent, Track } from 'livekit-client';

import { Room, RoomMediaState } from '@/entities/Room/model/types';
import { roomApi } from '@/features/Room/api/roomApi';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

function formatDateTime(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function secondsToClock(value: number) {
  const total = Math.max(0, Math.floor(value));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function roomKindMeta(kind: string) {
  if (kind === 'watch_party') {
    return {
      label: 'Совместный просмотр',
      icon: <Video size={22} />,
      accent: '#f59e0b',
      soft: 'rgba(245, 158, 11, 0.12)',
      glow: 'rgba(245, 158, 11, 0.22)',
    };
  }

  return {
    label: 'Голосовая',
    icon: <Mic size={22} />,
    accent: 'var(--accent-color)',
    soft: 'rgba(79, 70, 229, 0.12)',
    glow: 'rgba(79, 70, 229, 0.22)',
  };
}

function normalizeMediaUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed;
}

const ghostButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  padding: '14px 18px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'transform 0.2s, background-color 0.2s, border-color 0.2s',
  textDecoration: 'none',
};

const subtleCardStyle: React.CSSProperties = {
  padding: '14px',
  borderRadius: '18px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
};

export const RoomPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { roomId = '' } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [mediaState, setMediaState] = useState<RoomMediaState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(true);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [error, setError] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [liveKitProvider, setLiveKitProvider] = useState('');
  const [liveKitServerUrl, setLiveKitServerUrl] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [currentTimeInput, setCurrentTimeInput] = useState('0');
  const [copySuccess, setCopySuccess] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isRoomAudioReady, setIsRoomAudioReady] = useState(false);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<string[]>([]);

  const liveRoomRef = useRef<LiveKitRoom | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const isRoomAudioReadyRef = useRef(false);
  const playerRef = useRef<any>(null);

  const hasVoiceChat = Boolean(joinToken && liveKitProvider === 'livekit' && liveKitServerUrl);
  const activeMediaUrl = mediaState?.mediaUrl || mediaUrlInput;

  const refreshRoomSnapshot = async () => {
    const nextRoom = await roomApi.getRoom(roomId);
    setRoom(nextRoom);
    setMediaState(nextRoom.mediaState);
    if (nextRoom.kind === 'watch_party') {
      setMediaUrlInput(nextRoom.mediaState?.mediaUrl ?? '');
      setCurrentTimeInput(String(nextRoom.mediaState?.currentTimeSeconds ?? 0));
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const bootstrap = async () => {
      try {
        setIsLoading(true);
        setIsJoining(true);
        setError('');

        const [roomResponse, joinResponse] = await Promise.all([
          roomApi.getRoom(roomId),
          roomApi.joinRoomToken(roomId),
        ]);

        if (isCancelled) return;

        const nextRoom = joinResponse.room.id ? joinResponse.room : roomResponse;
        setRoom(nextRoom);
        setMediaState(nextRoom.mediaState);
        setMediaUrlInput(nextRoom.mediaState?.mediaUrl ?? '');
        setCurrentTimeInput(String(nextRoom.mediaState?.currentTimeSeconds ?? 0));
        setJoinToken(joinResponse.accessToken);
        setLiveKitProvider(joinResponse.provider);
        setLiveKitServerUrl(joinResponse.serverUrl);
      } catch (loadError) {
        if (isCancelled) return;
        console.error(loadError);
        setError('Не удалось загрузить комнату');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsJoining(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    isRoomAudioReadyRef.current = isRoomAudioReady;
  }, [isRoomAudioReady]);

  useEffect(() => {
    if (!room || !joinToken || liveKitProvider !== 'livekit' || !liveKitServerUrl) {
      return undefined;
    }

    let isDisposed = false;
    const liveRoom = new LiveKitRoom();
    liveRoomRef.current = liveRoom;

    const syncVoiceState = () => {
      if (isDisposed) return;
      setConnectionState(liveRoom.state);
      setIsMicEnabled(liveRoom.localParticipant.isMicrophoneEnabled);
    };

    const syncBackendParticipants = () => {
      void roomApi.getRoom(roomId)
        .then((nextRoom) => {
          if (isDisposed) return;
          setRoom(nextRoom);
          if (nextRoom.mediaState) {
            setMediaState(nextRoom.mediaState);
          }
        })
        .catch((refreshError) => {
          console.error(refreshError);
        });
    };

    liveRoom
      .on(RoomEvent.ConnectionStateChanged, () => {
        syncVoiceState();
      })
      .on(RoomEvent.ParticipantConnected, () => {
        syncVoiceState();
        syncBackendParticipants();
      })
      .on(RoomEvent.ParticipantDisconnected, () => {
        syncVoiceState();
        syncBackendParticipants();
      })
      .on(RoomEvent.TrackMuted, syncVoiceState)
      .on(RoomEvent.TrackUnmuted, syncVoiceState)
      .on(RoomEvent.LocalTrackPublished, syncVoiceState)
      .on(RoomEvent.LocalTrackUnpublished, syncVoiceState)
      .on(RoomEvent.ActiveSpeakersChanged, (participants) => {
        if (isDisposed) return;
        setActiveSpeakerIds(participants.map((participant) => participant.identity));
      })
      .on(RoomEvent.TrackSubscribed, (track) => {
        if (isDisposed || track.kind !== Track.Kind.Audio || !audioContainerRef.current) {
          return;
        }
        const element = track.attach();
        element.style.display = 'none';
        element.muted = !isRoomAudioReadyRef.current;
        audioContainerRef.current.appendChild(element);
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) {
          return;
        }
        track.detach().forEach((element) => element.remove());
      });

    void (async () => {
      try {
        setIsLiveConnecting(true);
        await liveRoom.connect(liveKitServerUrl, joinToken);
        syncVoiceState();
        try {
          await liveRoom.startAudio();
          if (!isDisposed) {
            setIsRoomAudioReady(true);
            isRoomAudioReadyRef.current = true;
          }
        } catch (audioError) {
          if (!isDisposed) {
            setIsRoomAudioReady(false);
            isRoomAudioReadyRef.current = false;
          }
          console.error(audioError);
        }
        syncBackendParticipants();
      } catch (connectError) {
        if (isDisposed) return;
        console.error(connectError);
        setError('Не удалось подключиться к голосовой комнате');
      } finally {
        if (!isDisposed) {
          setIsLiveConnecting(false);
        }
      }
    })();

    return () => {
      isDisposed = true;
      setActiveSpeakerIds([]);
      setIsMicEnabled(false);
      setIsRoomAudioReady(false);
      isRoomAudioReadyRef.current = false;
      if (audioContainerRef.current) {
        audioContainerRef.current.innerHTML = '';
      }
      void liveRoom.disconnect();
      liveRoomRef.current = null;
    };
  }, [joinToken, liveKitProvider, liveKitServerUrl, room?.kind, roomId]);

  useEffect(() => {
    if (room?.kind !== 'watch_party' || !playerRef.current || !mediaState?.mediaUrl) {
      return;
    }

    const targetTime = Number(mediaState.currentTimeSeconds || 0);
    const currentTime = playerRef.current.getCurrentTime?.() ?? 0;
    if (Math.abs(currentTime - targetTime) > 1.5) {
      playerRef.current.seekTo(targetTime, 'seconds');
    }
  }, [mediaState, room?.kind]);

  const handleRefresh = async () => {
    try {
      setError('');
      await refreshRoomSnapshot();
      if (room?.kind === 'watch_party') {
        const nextMediaState = await roomApi.getRoomMediaState(roomId);
        setMediaState(nextMediaState);
        setMediaUrlInput(nextMediaState.mediaUrl);
        setCurrentTimeInput(String(nextMediaState.currentTimeSeconds));
      }
    } catch (refreshError) {
      console.error(refreshError);
      setError('Не удалось обновить комнату');
    }
  };

  const handleSaveMediaState = async (paused: boolean) => {
    try {
      setIsSavingMedia(true);
      setError('');

      const playerCurrentTime = playerRef.current?.getCurrentTime?.();
      const nextCurrentTime = Number.isFinite(playerCurrentTime)
        ? Math.floor(playerCurrentTime ?? 0)
        : (Number(currentTimeInput) || 0);

      const nextMediaState = await roomApi.upsertRoomMediaState(roomId, {
        mediaUrl: mediaUrlInput.trim(),
        paused,
        currentTimeSeconds: nextCurrentTime,
      });

      setMediaState(nextMediaState);
      setCurrentTimeInput(String(nextMediaState.currentTimeSeconds));
    } catch (saveError) {
      console.error(saveError);
      setError('Не удалось сохранить состояние просмотра');
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1800);
    } catch (copyError) {
      console.error(copyError);
    }
  };

  const handleEnableRoomAudio = async () => {
    const liveRoom = liveRoomRef.current;
    if (!liveRoom) return;

    try {
      const nextAudioState = !isRoomAudioReady;
      if (nextAudioState) {
        await liveRoom.startAudio();
      }
      if (audioContainerRef.current) {
        Array.from(audioContainerRef.current.querySelectorAll('audio')).forEach((element) => {
          (element as HTMLAudioElement).muted = !nextAudioState;
        });
      }
      setIsRoomAudioReady(nextAudioState);
      isRoomAudioReadyRef.current = nextAudioState;
      setError('');
    } catch (audioError) {
      console.error(audioError);
      setError('Браузер не дал запустить звук комнаты');
    }
  };

  const handleToggleMicrophone = async () => {
    const liveRoom = liveRoomRef.current;
    if (!liveRoom) {
      setError('Голосовая комната еще не подключена');
      return;
    }

    try {
      const nextEnabled = !liveRoom.localParticipant.isMicrophoneEnabled;
      await liveRoom.localParticipant.setMicrophoneEnabled(nextEnabled);
      setIsMicEnabled(liveRoom.localParticipant.isMicrophoneEnabled);
      setError('');
    } catch (microphoneError) {
      console.error(microphoneError);
      setError('Не удалось получить доступ к микрофону');
    }
  };

  const speakerSet = useMemo(() => new Set(activeSpeakerIds), [activeSpeakerIds]);
  const connectionLabel = useMemo(() => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return 'Подключено';
      case ConnectionState.Connecting:
        return 'Подключение';
      case ConnectionState.Reconnecting:
        return 'Переподключение';
      case ConnectionState.SignalReconnecting:
        return 'Восстановление сигнала';
      default:
        return 'Отключено';
    }
  }, [connectionState]);

  if (isLoading && !room) {
    return (
      <div
        className="fade-in"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}
      >
        <Loader2 className="spin" size={28} color="var(--accent-color)" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="fade-in">
        <button
          type="button"
          onClick={() => navigate('/rooms')}
          className="hover-scale"
          style={{ ...ghostButtonStyle, marginBottom: '20px' }}
        >
          <ArrowLeft size={18} /> Назад к комнатам
        </button>
        <div className="card" style={{ color: '#fca5a5' }}>
          {error || 'Комната не найдена'}
        </div>
      </div>
    );
  }

  const roomMeta = roomKindMeta(room.kind ?? 'voice');
  const isWatchPartyRoom = room.kind === 'watch_party';
  const voiceChatCard = hasVoiceChat ? (
    <div
      className="card"
      style={{
        border: '1px solid rgba(79, 70, 229, 0.22)',
        background:
          'linear-gradient(180deg, rgba(79, 70, 229, 0.12) 0%, rgba(17, 17, 19, 0.95) 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'rgba(79, 70, 229, 0.18)',
            color: 'var(--accent-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Radio size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Голосовой чат
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            LiveKit уже подключен к комнате. Можно говорить и смотреть видео одновременно.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
        <div style={subtleCardStyle}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Подключение</div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>{connectionLabel}</div>
        </div>
        <div style={subtleCardStyle}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Аудио комнаты</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: isRoomAudioReady ? '#34d399' : 'var(--text-primary)' }}>
            {isRoomAudioReady ? 'Готово' : 'Нужно разрешение'}
          </div>
        </div>
        <div style={subtleCardStyle}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Микрофон</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: isMicEnabled ? '#34d399' : 'var(--text-primary)' }}>
            {isMicEnabled ? 'Включен' : 'Выключен'}
          </div>
        </div>
        <div style={subtleCardStyle}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Говорят сейчас</div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>{activeSpeakerIds.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => void handleEnableRoomAudio()}
          className="hover-scale"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: '16px',
            border: '1px solid rgba(79, 70, 229, 0.35)',
            background: 'var(--accent-color)',
            color: 'white',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Volume2 size={18} /> {isRoomAudioReady ? 'Выключить звук комнаты' : 'Включить звук комнаты'}
        </button>
        <button
          type="button"
          onClick={() => void handleToggleMicrophone()}
          className="hover-scale"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: isMicEnabled ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.05)',
            color: isMicEnabled ? '#34d399' : 'var(--text-primary)',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            opacity: isLiveConnecting || connectionState !== ConnectionState.Connected ? 0.7 : 1,
          }}
        >
          {isMicEnabled ? <MicOff size={18} /> : <Mic size={18} />}
          {isMicEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
        </button>
      </div>
    </div>
  ) : null;
  const participantsCard = (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <Users size={20} color="var(--accent-color)" />
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
          Участники
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {room.participants.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)' }}>
            Пока никого нет в комнате.
          </div>
        ) : (
          room.participants.map((participant) => {
            const isSpeaking = speakerSet.has(participant.userId);

            return (
              <div
                key={participant.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '16px',
                  background: participant.isCurrentUser
                    ? 'rgba(79, 70, 229, 0.1)'
                    : 'rgba(255,255,255,0.03)',
                  border: isSpeaking
                    ? '1px solid rgba(16,185,129,0.35)'
                    : '1px solid rgba(255,255,255,0.04)',
                  boxShadow: isSpeaking ? '0 0 0 1px rgba(16,185,129,0.08)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#2a2a2a',
                    flexShrink: 0,
                    outline: isSpeaking ? '2px solid #34d399' : 'none',
                  }}
                >
                  {participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : null}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <span>{participant.title}{participant.isCurrentUser ? ' · Вы' : ''}</span>
                    {hasVoiceChat && isSpeaking && (
                      <span style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Говорит
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    @{participant.telegramUsername || 'no_username'} · {formatDateTime(participant.joinedAt)}
                  </div>
                </div>
                {hasVoiceChat && (
                  <div style={{ color: participant.isCurrentUser && isMicEnabled ? '#34d399' : 'var(--text-secondary)' }}>
                    {participant.isCurrentUser && isMicEnabled ? <Mic size={16} /> : <Volume2 size={16} />}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div ref={audioContainerRef} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <button
            type="button"
            onClick={() => navigate('/rooms')}
            className="hover-scale"
            style={{ ...ghostButtonStyle, marginBottom: '16px' }}
          >
            <ArrowLeft size={18} /> Назад к комнатам
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '18px',
                background: roomMeta.soft,
                color: roomMeta.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 12px 24px ${roomMeta.glow}`,
              }}
            >
              {roomMeta.icon}
            </div>
            <div>
              <h1 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '4px' }}>
                {room.title}
              </h1>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: roomMeta.soft,
                  color: roomMeta.accent,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {roomMeta.label}
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '760px' }}>
            {room.description || 'Описание комнаты пока не добавлено.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button
            type="button"
            onClick={handleCopyInvite}
            className="hover-scale"
            style={{
              ...ghostButtonStyle,
              width: isMobile ? '100%' : 'auto',
              background: copySuccess ? 'rgba(16,185,129,0.12)' : ghostButtonStyle.background,
              borderColor: copySuccess ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.08)',
              color: copySuccess ? '#34d399' : 'var(--text-primary)',
            }}
          >
            {copySuccess ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            {copySuccess ? 'Ссылка скопирована' : 'Скопировать ссылку'}
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="hover-scale"
            style={{ ...ghostButtonStyle, width: isMobile ? '100%' : 'auto' }}
          >
            <RefreshCcw size={18} /> Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)' }}>
          {error}
        </div>
      )}

      {isWatchPartyRoom && (
        <div
          className="card"
          style={{
            border: '1px solid rgba(245, 158, 11, 0.24)',
            background:
              'linear-gradient(180deg, rgba(245, 158, 11, 0.10) 0%, rgba(17, 17, 19, 0.98) 100%)',
            padding: isMobile ? '20px' : '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <PlayCircle size={24} color="#f59e0b" />
            <div>
              <h2 style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: 800, marginBottom: '4px' }}>
                Совместный просмотр
              </h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '14px' : '16px' }}>
                Главный экран комнаты: видео, синхронизация позиции и голосовой чат работают вместе.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
              <input
                className="input"
                placeholder="https://..."
                value={mediaUrlInput}
                onChange={(event) => setMediaUrlInput(event.target.value)}
              />

              {normalizeMediaUrl(activeMediaUrl) && (
                <div
                  style={{
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: '#000',
                    width: '100%',
                    aspectRatio: '16 / 9',
                    minHeight: isMobile ? '220px' : 'min(70vh, 920px)',
                  }}
                >
                  <ReactPlayer
                    ref={playerRef}
                    src={normalizeMediaUrl(activeMediaUrl)}
                    controls
                    width="100%"
                    height="100%"
                    playing={!mediaState?.paused}
                    onProgress={(state: any) => {
                      const playedSeconds = Number(state?.playedSeconds ?? 0);
                      setCurrentTimeInput(String(Math.floor(playedSeconds)));
                    }}
                    style={{ width: '100%', height: '100%', display: 'block', background: '#000' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'center' }}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={currentTimeInput}
                  onChange={(event) => setCurrentTimeInput(event.target.value)}
                  placeholder="Позиция в секундах"
                />
                <div style={{ color: 'var(--text-secondary)', fontSize: '16px', minWidth: '80px', textAlign: isMobile ? 'left' : 'right' }}>
                  {secondsToClock(Number(currentTimeInput) || 0)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="hover-scale"
                  onClick={() => void handleSaveMediaState(false)}
                  disabled={isSavingMedia}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 18px',
                    borderRadius: '16px',
                    border: '1px solid rgba(245,158,11,0.4)',
                    background: '#f59e0b',
                    color: '#111111',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isSavingMedia ? 'not-allowed' : 'pointer',
                    opacity: isSavingMedia ? 0.7 : 1,
                  }}
                >
                  <Radio size={16} /> Play
                </button>
                <button
                  type="button"
                  className="hover-scale"
                  onClick={() => void handleSaveMediaState(true)}
                  disabled={isSavingMedia}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 18px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isSavingMedia ? 'not-allowed' : 'pointer',
                    opacity: isSavingMedia ? 0.7 : 1,
                  }}
                >
                  <PauseCircle size={16} /> Pause / Save
                </button>

                {mediaState?.mediaUrl && (
                  <a
                    href={mediaState.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover-scale"
                    style={{
                      ...ghostButtonStyle,
                      width: 'fit-content',
                      background: 'rgba(245, 158, 11, 0.12)',
                      borderColor: 'rgba(245, 158, 11, 0.28)',
                      color: '#fbbf24',
                    }}
                  >
                    Открыть текущее видео
                  </a>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)',
                  gap: '20px',
                  alignItems: 'start',
                }}
              >
                {voiceChatCard}
                {participantsCard}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isWatchPartyRoom ? '1fr' : 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ background: 'linear-gradient(180deg, rgba(79, 70, 229, 0.06) 0%, rgba(36,36,36,1) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
                  Состояние комнаты
                </h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {room.kind === 'watch_party'
                    ? 'Ссылка на видео, play/pause, позиция и голосовой чат работают вместе.'
                    : 'Голосовая комната уже подключается через LiveKit. Ниже можно включить звук комнаты и микрофон.'}
                </div>
              </div>
              {(isJoining || isLoading || isLiveConnecting) && (
                <Loader2 className="spin" size={20} color="var(--accent-color)" />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={subtleCardStyle}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Участников</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{room.memberCount}</div>
              </div>
              <div style={subtleCardStyle}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Создатель</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{room.creatorName || 'Неизвестно'}</div>
              </div>
              <div style={subtleCardStyle}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Подключение</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>
                  {hasVoiceChat ? connectionLabel : 'Backend sync'}
                </div>
              </div>
            </div>
          </div>

          {!isWatchPartyRoom && voiceChatCard}

        </div>

        {!isWatchPartyRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {participantsCard}

            <div className="card">
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '14px' }}>
                Технический статус
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--text-secondary)' }}>
                <div>Room ID: {room.id}</div>
                <div>Создана: {formatDateTime(room.createdAt)}</div>
                <div>Обновлена: {formatDateTime(room.updatedAt)}</div>
                <div>Join token: {joinToken ? 'получен' : 'еще нет'}</div>
                <div>Provider: {liveKitProvider || 'n/a'}</div>
                {liveKitServerUrl && <div>LiveKit URL: {liveKitServerUrl}</div>}
                {hasVoiceChat && (
                  <>
                    <div>Connection: {connectionLabel}</div>
                    <div>Микрофон: {isMicEnabled ? 'on' : 'off'}</div>
                  </>
                )}
                {mediaState && (
                  <div>
                    Media state: {mediaState.paused ? 'paused' : 'playing'} · {secondsToClock(mediaState.currentTimeSeconds)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
