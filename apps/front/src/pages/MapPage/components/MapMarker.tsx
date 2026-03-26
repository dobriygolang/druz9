import React from 'react';
import { Calendar } from 'lucide-react';
import { DisplayUserPoint, DisplayEvent, UserCluster } from './types';

interface PinMarkerProps {
  avatarUrl?: string;
  label: string;
  count?: number | string;
  isCurrentUser?: boolean;
  color?: string;
  icon?: React.ElementType;
}

function getInitials(label: string) {
  return label.trim().charAt(0).toUpperCase() || 'U';
}

export const PinMarker: React.FC<PinMarkerProps> = ({
  avatarUrl,
  label,
  count,
  isCurrentUser,
  color = '#4f46e5',
  icon: Icon,
}) => {
  const markerColor = isCurrentUser ? '#ef4444' : color;

  return (
    <div
      style={{
        position: 'relative',
        width: '48px',
        height: '64px',
        transform: 'translate(-50%, -100%)',
        filter: 'drop-shadow(0 12px 24px rgba(0, 0, 0, 0.5))',
        cursor: 'pointer',
      }}
    >
      {/* Pin SVG Background - Balanced for stroke */}
      <svg
        viewBox="0 0 48 64"
        width="48"
        height="64"
        style={{ position: 'absolute', inset: 0 }}
      >
        <path
          d="M24 62L10 45.5C4.5 39.5 2 32 2 24C2 11.8 11.8 2 24 2C36.2 2 46 11.8 46 24C46 32 43.5 39.5 38 45.5L24 62Z"
          fill="rgba(15, 23, 42, 0.98)"
          stroke={markerColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Avatar / Icon / Initials Container - Centered in 48x64 */}
      <div
        style={{
          position: 'absolute',
          top: '5px',
          left: '5px',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : Icon ? (
          <Icon size={20} color={markerColor} />
        ) : (
          <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
            {getInitials(label)}
          </span>
        )}
      </div>

      {/* Count / Badge - Adjusted position */}
      {((typeof count === 'number' && count > 1) || isCurrentUser) && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontSize: (typeof count === 'number' && count > 9) ? '10px' : '11px',
            fontWeight: 800,
            zIndex: 3,
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {count || 'Я'}
        </div>
      )}
    </div>
  );
};

export const UserMarker: React.FC<{ point: DisplayUserPoint }> = ({ point }) => {
  const fullName = `${point.firstName} ${point.lastName}`.trim();
  const label = fullName || point.title || point.telegramUsername || 'User';

  return (
    <PinMarker
      avatarUrl={point.avatarUrl}
      label={label}
      isCurrentUser={point.isCurrentUser}
    />
  );
};

export const ClusterMarker: React.FC<{ cluster: UserCluster }> = ({ cluster }) => {
  const label = cluster.sample.title || cluster.sample.telegramUsername || 'Cluster';

  return (
    <PinMarker
      avatarUrl={cluster.sample.avatarUrl}
      label={label}
      count={cluster.count}
      color="#888"
    />
  );
};

export const EventMarker: React.FC<{ event: DisplayEvent }> = ({ event }) => {
  return (
    <PinMarker
      label="Event"
      color={event.is_joined ? '#fff' : '#666'}
      count={event.participants.length}
      icon={Calendar}
    />
  );
};
