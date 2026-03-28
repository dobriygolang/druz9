import React, { useEffect, useState } from 'react';

type GuestNameModalProps = {
  open: boolean;
  initialValue?: string;
  title?: string;
  description?: string;
  confirmText?: string;
  onConfirm: (name: string) => void;
  onCancel?: () => void;
};

export const GuestNameModal: React.FC<GuestNameModalProps> = ({
  open,
  initialValue = '',
  title = 'Please, introduce yourself',
  description = 'Это имя увидят участники комнаты рядом с вашим курсором и сообщениями.',
  confirmText = 'Submit',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValue(initialValue);
  }, [initialValue, open]);

  if (!open) {
    return null;
  }

  const trimmed = value.trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!trimmed) {
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div className="guest-name-modal-backdrop">
      <div className="guest-name-modal">
        <div className="guest-name-modal__header">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <form className="guest-name-modal__form" onSubmit={handleSubmit}>
          <input
            className="guest-name-modal__input"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Your name"
            aria-label="Ваше имя"
            maxLength={32}
            autoFocus
          />

          <div className="guest-name-modal__actions">
            {onCancel && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn guest-name-modal__submit"
              disabled={!trimmed}
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
