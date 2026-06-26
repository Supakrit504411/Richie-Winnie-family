'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { showAlert, hideAlert } from '@/components/SweetAlert';

export default function Home() {
  const { user, login, register, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'child' | 'parent'>('parent');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [parents, setParents] = useState<Pick<User, 'id' | 'username' | 'avatar'>[]>([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [parentMode, setParentMode] = useState<'create' | 'join'>('create');
  const [familyInviteCode, setFamilyInviteCode] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetInviteCode, setResetInviteCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'register' && role === 'child') {
      fetch('/api/parents')
        .then(res => res.json())
        .then(data => setParents(data.parents ?? []))
        .catch(() => setParents([]));
    }
  }, [mode, role]);

  useEffect(() => {
    if (user) {
      hideAlert();
      if (user.role === 'parent') {
        router.push('/dashboard/parent');
      } else {
        router.push('/dashboard/child');
      }
    }
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const loadingTitle =
      mode === 'login'
        ? showReset
          ? 'กำลังรีเซ็ตรหัส...'
          : 'กำลังเข้าสู่ระบบ...'
        : 'กำลังสมัครสมาชิก...';

    showAlert({ title: loadingTitle, icon: 'loading', showConfirmButton: false });

    try {
    if (mode === 'login' && showReset) {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          new_password: newPassword,
          family_invite_code: resetInviteCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        hideAlert();
        setError(data.error || 'รีเซ็ตรหัสไม่สำเร็จ');
        return;
      }
      if (data.session && data.profile) {
        hideAlert();
        await supabase.auth.setSession(data.session);
        router.push(data.profile.role === 'parent' ? '/dashboard/parent' : '/dashboard/child');
        return;
      }
      hideAlert();
      setShowReset(false);
      setPassword(newPassword);
      setNewPassword('');
      setError('เปลี่ยนรหัสแล้ว — ลองเข้าสู่ระบบด้วยรหัสใหม่');
      return;
    }

    if (mode === 'login') {
      const result = await login(username.trim(), password);
      if (!result.success) {
        hideAlert();
        setError(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
      } else {
        hideAlert();
      }
    } else {
      if (role === 'child' && !selectedParent) {
        hideAlert();
        setError('กรุณาเลือกพ่อ/แม่');
        return;
      }
      if (role === 'parent' && parentMode === 'join' && !familyInviteCode.trim()) {
        hideAlert();
        setError('กรุณาใส่รหัสเชิญครอบครัว');
        return;
      }
      const result = await register(
        username.trim(),
        password,
        role,
        undefined,
        selectedParent || undefined,
        role === 'parent' ? parentMode : undefined,
        role === 'parent' && parentMode === 'join' ? familyInviteCode.trim() : undefined
      );
      if (!result.success) {
        hideAlert();
        setError(result.error || 'สมัครไม่สำเร็จ');
      } else {
        hideAlert();
      }
    }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏠</div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Kanit', color: 'var(--ink)' }}>
            ภารกิจครอบครัว
          </h1>
          <p className="text-lg" style={{ color: 'var(--ink-soft)' }}>
            นักผจญภัยตัวน้อย
          </p>
        </div>

        {/* Login / Register Card */}
        <div className="card">
          {/* Mode Toggle */}
          <div className="flex mb-6 rounded-full overflow-hidden" style={{ border: '2px solid var(--line)' }}>
            <button
              className="flex-1 py-3 font-bold"
              style={{
                background: mode === 'login' ? 'var(--coral)' : 'transparent',
                color: mode === 'login' ? 'white' : 'var(--ink-soft)',
              }}
              onClick={() => setMode('login')}
            >
              เข้าสู่ระบบ
            </button>
            <button
              className="flex-1 py-3 font-bold"
              style={{
                background: mode === 'register' ? 'var(--coral)' : 'transparent',
                color: mode === 'register' ? 'white' : 'var(--ink-soft)',
              }}
              onClick={() => setMode('register')}
            >
              สมัคร
            </button>
          </div>

          {/* Role Selection (Register only) */}
          {mode === 'register' && (
            <div className="mb-6">
              <label className="field-label">คุณคือใคร?</label>
              <div className="flex gap-3">
                <button
                  className={`flex-1 py-4 rounded-xl font-bold text-lg ${role === 'parent' ? 'ring-2 ring-offset-2 ring-[var(--forest)]' : ''}`}
                  style={{
                    background: role === 'parent' ? 'var(--forest)' : 'var(--line)',
                    color: role === 'parent' ? 'white' : 'var(--ink-soft)',
                  }}
                  onClick={() => setRole('parent')}
                >
                  พ่อ/แม่
                </button>
                <button
                  className={`flex-1 py-4 rounded-xl font-bold text-lg ${role === 'child' ? 'ring-2 ring-offset-2 ring-[var(--coral)]' : ''}`}
                  style={{
                    background: role === 'child' ? 'var(--coral)' : 'var(--line)',
                    color: role === 'child' ? 'white' : 'var(--ink-soft)',
                  }}
                  onClick={() => setRole('child')}
                >
                  ลูก
                </button>
              </div>
            </div>
          )}

          {/* Parent mode (Register parent only) */}
          {mode === 'register' && role === 'parent' && (
            <div className="mb-6">
              <label className="field-label">สมัครในฐานะ</label>
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  className={`flex-1 py-3 rounded-xl font-bold ${parentMode === 'create' ? 'ring-2 ring-offset-2 ring-[var(--forest)]' : ''}`}
                  style={{
                    background: parentMode === 'create' ? 'var(--forest)' : 'var(--line)',
                    color: parentMode === 'create' ? 'white' : 'var(--ink-soft)',
                  }}
                  onClick={() => setParentMode('create')}
                >
                  สร้างครอบครัวใหม่
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 rounded-xl font-bold ${parentMode === 'join' ? 'ring-2 ring-offset-2 ring-[var(--coral)]' : ''}`}
                  style={{
                    background: parentMode === 'join' ? 'var(--coral)' : 'var(--line)',
                    color: parentMode === 'join' ? 'white' : 'var(--ink-soft)',
                  }}
                  onClick={() => setParentMode('join')}
                >
                  เข้าร่วมครอบครัว
                </button>
              </div>
              {parentMode === 'join' && (
                <div className="field">
                  <label className="field-label">รหัสเชิญจากพ่อ/แม่คนแรก</label>
                  <input
                    type="text"
                    value={familyInviteCode}
                    onChange={(e) => setFamilyInviteCode(e.target.value.toUpperCase())}
                    placeholder="เช่น ABC123"
                    maxLength={8}
                    required
                  />
                </div>
              )}
              {parentMode === 'create' && (
                <p className="muted text-sm">หลังสมัครจะได้รหัสเชิญให้แม่/พ่ออีกคนเข้าร่วมครอบครัวเดียวกัน</p>
              )}
            </div>
          )}

          {/* Parent Selection (Child Register only) */}
          {mode === 'register' && role === 'child' && (
            <div className="mb-6">
              <label className="field-label">เลือกพ่อ/แม่ ของคุณ</label>
              <select
                className="w-full py-3 px-4 rounded-xl border-2"
                style={{ borderColor: 'var(--line)' }}
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
              >
                <option value="">-- เลือกพ่อ/แม่ --</option>
                {parents.map(p => (
                  <option key={p.id} value={p.id}>{p.avatar} {p.username}</option>
                ))}
              </select>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label">ชื่อผู้ใช้</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น พ่อเจน, น้องพีช"
                required
              />
            </div>

            {mode === 'login' && showReset && (
              <>
                <p className="muted text-sm mb-3">ใส่รหัสเชิญครอบครัว (ดูจาก Supabase → Table Editor → families)</p>
                <div className="field">
                  <label className="field-label">รหัสเชิญครอบครัว</label>
                  <input
                    type="text"
                    value={resetInviteCode}
                    onChange={(e) => setResetInviteCode(e.target.value.toUpperCase())}
                    placeholder="เช่น ABC123"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">รหัสผ่านใหม่</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 4 ตัว"
                    required
                    minLength={4}
                  />
                </div>
              </>
            )}

            {mode === 'login' && !showReset && (
            <div className="field">
              <label className="field-label">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                required
                minLength={4}
              />
            </div>
            )}

            {mode === 'register' && (
            <div className="field">
              <label className="field-label">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                required
                minLength={4}
              />
            </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: '#FDEAEA', color: '#C13B3B' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              {submitting
                ? 'กำลังดำเนินการ...'
                : mode === 'login' && showReset
                  ? 'ตั้งรหัสใหม่'
                  : mode === 'login'
                    ? 'เข้าสู่ระบบ'
                    : 'สมัคร'}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-block mt-2"
                onClick={() => { setShowReset(!showReset); setError(''); }}
              >
                {showReset ? '← กลับไปเข้าสู่ระบบ' : 'ลืมรหัสผ่าน?'}
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 muted">
          แอปเกมสะสมแต้มสำหรับครอบครัว 🎮
        </p>
      </div>
    </div>
  );
}
