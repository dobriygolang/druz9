import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type FancySelectOption = {
  value: string;
  label: string;
};

type FancySelectProps = {
  value: string;
  options: FancySelectOption[];
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
};

export const FancySelect: React.FC<FancySelectProps> = ({
  value,
  options,
  placeholder,
  className = '',
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`fancy-select ${className}`.trim()}>
      <button
        type="button"
        className={`fancy-select__trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="fancy-select__value">{selected?.label || placeholder || 'Выберите значение'}</span>
        <ChevronDown size={16} className="fancy-select__icon" />
      </button>

      {open && (
        <div className="fancy-select__menu">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || '__empty'}
                type="button"
                className={`fancy-select__option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
