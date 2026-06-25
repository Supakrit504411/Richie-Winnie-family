interface SubmissionCardProps {
  submission: {
    id: string;
    child_id: string;
    mission_id: string;
    submission_date: string;
    status: 'pending' | 'approved' | 'rejected';
    evidence_urls?: string[];
    note?: string;
    reviewed_at?: string;
    missions?: {
      title: string;
      icon?: string;
      coin_reward: number;
      xp_reward: number;
    };
    users?: {
      username: string;
      avatar?: string;
    };
  };
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isParent?: boolean;
}

export default function SubmissionCard({
  submission,
  onApprove,
  onReject,
  isParent = false,
}: SubmissionCardProps) {
  const statusLabels = {
    pending: 'รอตรวจ',
    approved: 'สำเร็จ',
    rejected: 'ไม่ผ่าน',
  };

  const statusClasses = {
    pending: 'st-pending',
    approved: 'st-approved',
    rejected: 'st-rejected',
  };

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{submission.users?.avatar || '🐯'}</span>
            <p className="font-bold">{submission.users?.username || 'Unknown'}</p>
          </div>
          <p className="muted text-sm mt-1">
            {submission.missions?.icon} {submission.missions?.title || 'Mission'}
          </p>
          <p className="muted text-xs">
            {new Date(submission.submission_date).toLocaleDateString('th-TH')}
          </p>
        </div>
        <span className={`pill ${statusClasses[submission.status]}`}>
          {submission.status === 'approved' ? '✅ สำเร็จ' : submission.status === 'rejected' ? '❌ ไม่ผ่าน' : '⏳ รอตรวจ'}
        </span>
      </div>

      {/* Evidence Images */}
      {submission.evidence_urls && submission.evidence_urls.length > 0 && (
        <div className="evidence-grid mb-3">
          {submission.evidence_urls.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Evidence ${idx + 1}`}
              className="evidence-thumb"
            />
          ))}
        </div>
      )}

      {/* Note */}
      {submission.note && (
        <div className="p-2 rounded-lg mb-3" style={{ background: 'var(--cream)' }}>
          <p className="text-sm">{submission.note}</p>
        </div>
      )}

      {/* Parent Actions */}
      {isParent && submission.status === 'pending' && (
        <div className="flex gap-2">
          <button
            className="btn btn-primary btn-sm flex-1"
            onClick={() => onApprove?.(submission.id)}
          >
            ✅ ผ่าน ให้รางวัล
          </button>
          <button
            className="btn btn-danger btn-sm flex-1"
            onClick={() => onReject?.(submission.id)}
          >
            ❌ ไม่ผ่าน
          </button>
        </div>
      )}
    </div>
  );
}
