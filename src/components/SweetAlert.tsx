'use client';

import { useEffect, useState } from 'react';

export interface SweetAlertOptions {
  title: string;
  text?: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  timer?: number;
  showConfirmButton?: boolean;
}

type AlertState = SweetAlertOptions | null;

let setGlobalAlert: ((alert: AlertState) => void) | null = null;

export function showAlert(options: SweetAlertOptions) {
  setGlobalAlert?.(options);
}

export function hideAlert() {
  setGlobalAlert?.(null);
}

function SweetAlertModal({
  options,
  onClose,
}: {
  options: SweetAlertOptions;
  onClose: () => void;
}) {
  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳',
  };

  const icon = iconMap[options.icon || 'info'];
  const isLoading = options.icon === 'loading';

  return (
    <div className="sweet-alert-overlay" onClick={isLoading ? undefined : onClose}>
      <div className="sweet-alert-content" onClick={(e) => e.stopPropagation()}>
        <div className="sweet-alert-icon">{icon}</div>
        <h3 className="sweet-alert-title">{options.title}</h3>
        {options.text && <p className="sweet-alert-text">{options.text}</p>}
        {isLoading && <div className="sweet-alert-spinner" />}
        {!isLoading && options.showConfirmButton !== false && (
          <button className="btn btn-primary sweet-alert-btn" onClick={onClose}>
            ตกลง
          </button>
        )}
      </div>
    </div>
  );
}

export function SweetAlertProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<AlertState>(null);

  useEffect(() => {
    setGlobalAlert = setCurrent;
    return () => {
      setGlobalAlert = null;
    };
  }, []);

  useEffect(() => {
    if (current?.timer && current.timer > 0) {
      const timer = setTimeout(() => setCurrent(null), current.timer);
      return () => clearTimeout(timer);
    }
  }, [current]);

  return (
    <>
      {children}
      {current && (
        <SweetAlertModal options={current} onClose={() => setCurrent(null)} />
      )}
    </>
  );
}
