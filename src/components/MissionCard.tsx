'use client';

import { useState } from 'react';

interface MissionCardProps {
  mission: {
    id: string;
    title: string;
    icon?: string;
    type: 'daily' | 'special';
    deadline?: string;
    coin_reward: number;
    xp_reward: number;
    active: boolean;
  };
  status?: 'pending' | 'approved' | 'rejected';
  onToggle?: (id: string, active: boolean) => void;
  onDelete?: (id: string) => void;
  onEdit?: (mission: any) => void;
}

export default function MissionCard({
  mission,
  status,
  onToggle,
  onDelete,
  onEdit,
}: MissionCardProps) {
  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{mission.icon || '📋'}</span>
          <div>
            <p className="font-bold">{mission.title}</p>
            <p className="muted text-sm">
              +{mission.coin_reward} 🪙 | +{mission.xp_reward} XP
              {mission.deadline && ` | ⏰ ${mission.deadline}`}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {onToggle && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onToggle(mission.id, mission.active)}
            >
              {mission.active ? '🔘' : '⚫'}
            </button>
          )}
          {onEdit && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onEdit(mission)}
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onDelete(mission.id)}
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
