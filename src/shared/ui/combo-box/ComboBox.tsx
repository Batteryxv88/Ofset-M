import { useEffect, useRef, useState } from 'react';
import './ComboBox.scss';

type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Доп. CSS-класс для инпута (чтобы наследовать стиль родителя) */
  inputClassName?: string;
};

const ComboBox = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  inputClassName = '',
}: Props) => {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState(value);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);

  // Синхронизируем query с value при сбросе формы извне
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Закрыть при клике вне компонента
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setOpen(true);
    setActiveIdx(-1);
  };

  const handleSelect = (opt: string) => {
    setQuery(opt);
    onChange(opt);
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        return;
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => {
        const next = Math.min(i + 1, filtered.length - 1);
        scrollToActive(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => {
        const next = Math.max(i - 1, -1);
        if (next >= 0) scrollToActive(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && filtered[activeIdx]) {
        e.preventDefault();
        handleSelect(filtered[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const scrollToActive = (idx: number) => {
    requestAnimationFrame(() => {
      const el = listRef.current?.children[idx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    });
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (open) {
      setOpen(false);
    } else {
      inputRef.current?.focus();
      setOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="combo-box">
      <div className="combo-box__wrap">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className={`combo-box__input ${inputClassName}`}
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          className={`combo-box__arrow ${open ? 'combo-box__arrow--open' : ''}`}
          onMouseDown={toggleOpen}
          disabled={disabled}
          aria-label="Открыть список"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path
              d="M1 1l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div ref={listRef} className="combo-box__dropdown">
          {filtered.length === 0 ? (
            <div className="combo-box__no-opts">Ничего не найдено</div>
          ) : (
            filtered.map((opt, idx) => (
              <div
                key={opt}
                className={`combo-box__option ${idx === activeIdx ? 'combo-box__option--active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // чтобы input не терял фокус до клика
                  handleSelect(opt);
                }}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ComboBox;
