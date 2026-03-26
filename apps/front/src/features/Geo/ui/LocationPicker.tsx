import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

import {
  CompleteProfilePayload,
  LocationCandidate,
} from '@/entities/User/model/types';
import { geoApi } from '@/features/Geo/api/geoApi';
import { LocationPreviewMap } from '@/shared/ui/LocationPreviewMap';

interface LocationPickerProps {
  initialQuery?: string;
  initialCandidate?: LocationCandidate | null;
  inputPlaceholder?: string;
  showPreviewMap?: boolean;
  submitLabel: string;
  submitLoadingLabel: string;
  onSubmit: (payload: CompleteProfilePayload) => Promise<void>;
}

function sameCandidate(a: LocationCandidate | null, b: LocationCandidate | null) {
  if (!a || !b) {
    return false;
  }

  return a.displayName === b.displayName;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialQuery = '',
  initialCandidate = null,
  inputPlaceholder = 'Например: Электросталь, Россия',
  showPreviewMap = true,
  submitLabel,
  submitLoadingLabel,
  onSubmit,
}) => {
  const [regionQuery, setRegionQuery] = useState(initialQuery);
  const [candidates, setCandidates] = useState<LocationCandidate[]>(
    initialCandidate ? [initialCandidate] : [],
  );
  const [selectedCandidate, setSelectedCandidate] =
    useState<LocationCandidate | null>(initialCandidate);
  const [isResolving, setIsResolving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    setRegionQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!sameCandidate(initialCandidate, selectedCandidate)) {
      setSelectedCandidate(initialCandidate);
      setCandidates(initialCandidate ? [initialCandidate] : []);
    }
  }, [initialCandidate]);

  const selectedLocation = useMemo(
    () => selectedCandidate,
    [selectedCandidate],
  );

  const handleResolve = async () => {
    const query = regionQuery.trim();
    if (!query) {
      setResolveError('Введите город, регион или страну');
      setCandidates([]);
      setSelectedCandidate(null);
      return;
    }

    setIsResolving(true);
    setSelectedCandidate(null);
    setResolveError('');
    setSubmitError('');

    try {
      const nextCandidates = await geoApi.resolve(query);
      setCandidates(nextCandidates);
      setSelectedCandidate(nextCandidates[0] ?? null);
      if (nextCandidates.length === 0) {
        setResolveError('Ничего не нашли. Попробуйте уточнить запрос');
      }
    } catch (error) {
      setCandidates([]);
      setSelectedCandidate(null);
      setResolveError('Не удалось определить местоположение');
      console.error(error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCandidate) {
      setSubmitError('Сначала найдите и выберите подходящий вариант');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await onSubmit({
        region: selectedCandidate.region,
        country: selectedCandidate.country,
        city: selectedCandidate.city,
        latitude: selectedCandidate.latitude,
        longitude: selectedCandidate.longitude,
      });
    } catch (error) {
      setSubmitError('Не удалось сохранить локацию');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card" style={{ marginBottom: '24px' }}>
        <label
          htmlFor="region"
          style={{
            display: 'block',
            marginBottom: '10px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          Город, регион или страна
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <input
            id="region"
            type="text"
            className="input"
            placeholder={inputPlaceholder}
            value={regionQuery}
            onChange={(event) => {
              setRegionQuery(event.target.value);
              setResolveError('');
              setSubmitError('');
            }}
            disabled={isResolving || isSubmitting}
          />
          <button
            type="button"
            className="btn"
            onClick={handleResolve}
            disabled={!regionQuery.trim() || isResolving || isSubmitting}
            style={{ minWidth: '168px' }}
          >
            {isResolving ? 'Ищем...' : 'Найти варианты'}
          </button>
        </div>

        {resolveError && (
          <div
            style={{
              color: 'var(--danger-color)',
              marginTop: '12px',
              fontSize: '14px',
            }}
          >
            {resolveError}
          </div>
        )}
      </div>

      {isResolving && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
            <Loader2 size={18} className="spin" />
            Ищем подходящие адреса
          </div>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px', fontWeight: 600 }}>
              Найденные варианты
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Выберите один адрес из списка. Первый подходящий вариант уже выбран автоматически.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {candidates.map((candidate) => {
              const isSelected =
                selectedCandidate?.displayName === candidate.displayName;

              return (
                <button
                  key={candidate.displayName}
                  type="button"
                  onClick={() => setSelectedCandidate(candidate)}
                  style={{
                    textAlign: 'left',
                    width: '100%',
                    borderRadius: '18px',
                    border: isSelected
                      ? '1px solid var(--accent-color)'
                      : '1px solid var(--border-color)',
                    background: isSelected
                      ? 'rgba(79, 70, 229, 0.12)'
                      : 'var(--card-bg)',
                    color: 'var(--text-primary)',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '8px',
                    }}
                  >
                    <strong style={{ fontSize: '16px' }}>{candidate.region}</strong>
                    {isSelected && (
                      <span
                        style={{
                          color: 'var(--accent-color)',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Выбрано
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {candidate.displayName}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showPreviewMap && selectedLocation && (
        <div className="card" style={{ marginBottom: '24px', padding: '18px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <div
              style={{
                display: 'inline-flex',
                padding: '12px',
                backgroundColor: 'rgba(79, 70, 229, 0.12)',
                borderRadius: '16px',
                color: 'var(--accent-color)',
              }}
            >
              <MapPin size={22} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                {selectedLocation.region}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {selectedLocation.displayName}
              </div>
            </div>
          </div>
          <LocationPreviewMap candidate={selectedLocation} />
        </div>
      )}

      {submitError && (
        <div style={{ color: 'var(--danger-color)', marginTop: '16px', fontSize: '14px' }}>
          {submitError}
        </div>
      )}

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          className="btn"
          disabled={!selectedCandidate || isSubmitting || isResolving}
          style={{ minWidth: '240px' }}
        >
          {isSubmitting ? submitLoadingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
};
