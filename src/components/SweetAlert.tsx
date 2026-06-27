'use client';

import { useEffect, useState } from 'react';

export interface SweetAlertOptions {
  title: string;
  text?: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  timer?: number;
  showConfirmButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
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
  const hasCancel = Boolean(options.cancelButtonText);
  const hasCustomConfirm = Boolean(options.onConfirm);

  function handleConfirm() {
    options.onConfirm?.();
    onClose();
  }

  function handleCancel() {
    options.onCancel?.();
    onClose();
  }

  return (
    <div className="sweet-alert-overlay" onClick={isLoading ? undefined : onClose}>
      <div className="sweet-alert-content" onClick={(e) => e.stopPropagation()}>
        <div className="sweet-alert-icon">{icon}</div>
        <h3 className="sweet-alert-title">{options.title}</h3>
        {options.text && <p className="sweet-alert-text">{options.text}</p>}
        {isLoading && <div className="sweet-alert-spinner" />}
        {!isLoading && options.showConfirmButton !== false && (
          <div className={`sweet-alert-actions ${hasCancel ? 'sweet-alert-actions-dual' : ''}`}>
            {hasCancel && (
              <button className="btn btn-ghost sweet-alert-btn" onClick={handleCancel}>
                {options.cancelButtonText}
              </button>
            )}
            <button
              className="btn btn-primary sweet-alert-btn"
              onClick={hasCustomConfirm ? handleConfirm : onClose}
            >
              {options.confirmButtonText || 'ตกลง'}
            </button>
          </div>
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
