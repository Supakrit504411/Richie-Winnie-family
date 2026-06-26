'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { fetchWithAuth } from '@/lib/api-client';
import { showAlert } from '@/components/SweetAlert';

type AdminMember = {
  id: string;
  username: string;
  role: 'child' | 'parent';
  avatar?: string;
  created_at: string;
  family_id?: string;
  is_active?: boolean;
};

type AdminFamily = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  is_active?: boolean;
  members: AdminMember[];
};

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [families, setFamilies] = useState<AdminFamily[]>([]);
  const [orphanUsers, setOrphanUsers] = useState<AdminMember[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }

    fetchWithAuth('/api/admin/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.isAdmin) {
          router.replace('/dashboard/parent');
          return;
        }
        setIsAdmin(true);
        loadUsers();
      })
      .catch(() => router.replace('/dashboard/parent'));
  }, [user, loading, router]);

  async function loadUsers() {
    const res = await fetchWithAuth('/api/admin/users');
    const data = await res.json();
    if (res.ok) {
      setFamilies(data.families ?? []);
      setOrphanUsers(data.orphanUsers ?? []);
    }
  }

  async function toggleUser(userId: string, isActive: boolean) {
    setBusyId(userId);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert({ title: 'บันทึกไม่สำเร็จ', text: data.error, icon: 'error' });
        return;
      }
      await loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFamily(familyId: string, isActive: boolean) {
    setBusyId(`family-${familyId}`);
    try {
      const res = await fetchWithAuth(`/api/admin/families/${familyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert({ title: 'บันทึกไม่สำเร็จ', text: data.error, icon: 'error' });
        return;
      }
      await loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-12" style={{ background: 'var(--cream)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">🛡️ จัดการผู้ใช้</h1>
            <p className="muted text-sm mt-1">เปิด/ปิดครอบครัวหรือบัญชีที่ไม่รู้จัก</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/parent" className="btn btn-sm btn-ghost">
              ← กลับ
            </Link>
            <button className="btn btn-sm btn-ghost" onClick={() => logout().then(() => router.replace('/'))}>
              ออก
            </button>
          </div>
        </div>

        <div className="card mb-4">
          <p className="text-sm">
            <strong>วิธีใช้:</strong> ครอบครัวที่ไม่รู้จัก → กด &quot;ปิดครอบครัว&quot; จะเข้าใช้ไม่ได้ทั้งครอบครัว
            หรือปิดเฉพาะบัญชีรายคนได้
          </p>
        </div>

        {families.map((family) => {
          const familyActive = family.is_active !== false;
          return (
            <div key={family.id} className="card mb-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-bold">{family.name}</h2>
                  <p className="muted text-sm">
                    รหัสเชิญ: {family.invite_code} • สมาชิก {family.members.length} คน
                  </p>
                  <p className="muted text-sm">
                    สมัคร: {new Date(family.created_at).toLocaleDateString('th-TH')}
                  </p>
                </div>
                <button
                  className={`btn btn-sm ${familyActive ? 'btn-danger' : 'btn-primary'}`}
                  disabled={busyId === `family-${family.id}`}
                  onClick={() => toggleFamily(family.id, !familyActive)}
                >
                  {familyActive ? 'ปิดครอบครัว' : 'เปิดครอบครัว'}
                </button>
              </div>

              {!familyActive && (
                <p className="text-sm mb-3" style={{ color: 'var(--coral)' }}>
                  ⛔ ครอบครัวนี้ถูกปิด — สมาชิกทุกคนเข้าใช้ไม่ได้
                </p>
              )}

              <div className="space-y-2">
                {family.members.map((member) => {
                  const userActive = member.is_active !== false && familyActive;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'var(--cream)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{member.avatar || (member.role === 'parent' ? '👨' : '🐯')}</span>
                        <div>
                          <p className="font-bold">
                            {member.username}
                            <span className="muted font-normal text-sm ml-2">
                              {member.role === 'parent' ? 'พ่อ/แม่' : 'ลูก'}
                            </span>
                          </p>
                          <p className="muted text-xs">
                            {new Date(member.created_at).toLocaleDateString('th-TH')}
                          </p>
                        </div>
                      </div>
                      <button
                        className={`btn btn-sm ${userActive ? 'btn-ghost' : 'btn-primary'}`}
                        disabled={busyId === member.id || !familyActive}
                        onClick={() => toggleUser(member.id, member.is_active === false)}
                      >
                        {member.is_active === false ? 'เปิดบัญชี' : 'ปิดบัญชี'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {orphanUsers.length > 0 && (
          <div className="card mb-4">
            <h2 className="text-lg font-bold mb-3">บัญชีไม่มีครอบครัว</h2>
            <div className="space-y-2">
              {orphanUsers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--cream)' }}
                >
                  <p className="font-bold">{member.username}</p>
                  <button
                    className={`btn btn-sm ${member.is_active === false ? 'btn-primary' : 'btn-ghost'}`}
                    disabled={busyId === member.id}
                    onClick={() => toggleUser(member.id, member.is_active === false)}
                  >
                    {member.is_active === false ? 'เปิดบัญชี' : 'ปิดบัญชี'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {families.length === 0 && orphanUsers.length === 0 && (
          <div className="card">
            <p className="muted text-center">ยังไม่มีผู้ใช้ในระบบ</p>
          </div>
        )}
      </div>
    </div>
  );
}
