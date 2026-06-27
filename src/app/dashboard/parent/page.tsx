'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fetchWithAuth } from '@/lib/api-client';
import { User, Mission, Submission, ShopItem, Redemption, WishlistRequest, CoinHistory } from '@/lib/types';
import EvidenceUploader from '@/components/EvidenceUploader';
import ProfileAvatarEditor from '@/components/ProfileAvatarEditor';
import StorageImage from '@/components/StorageImage';
import { showAlert, hideAlert } from '@/components/SweetAlert';

export default function ParentDashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'missions' | 'shop' | 'history' | 'settings'>('overview');
  const [parent, setParent] = useState<User | null>(null);
  const [children, setChildren] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [wishlist, setWishlist] = useState<WishlistRequest[]>([]);

  useEffect(() => {
    hideAlert();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (user.role !== 'parent') {
      router.push('/dashboard/child');
      return;
    }
    setParent(user);
    fetchParentData(user);
  }, [user, loading, router]);

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  async function fetchParentData(profile: User) {
    const { data: freshParent } = await supabase
      .from('users')
      .select('*')
      .eq('id', profile.id)
      .single();
    if (freshParent) setParent(freshParent);

    const membersRes = await fetchWithAuth('/api/family/members?role=child');
    const membersData = await membersRes.json();
    const childrenData = membersRes.ok ? (membersData.members as User[]) : [];
    setChildren(childrenData);

    const childIds = (childrenData ?? []).map(c => c.id);
    if (childIds.length > 0) {
      const { data: subsData } = await supabase
        .from('submissions')
        .select('*')
        .in('child_id', childIds)
        .order('created_at', { ascending: false });
      if (subsData) setSubmissions(subsData);

      const { data: redemptionsData } = await supabase
        .from('redemptions')
        .select('*, shop_items(name, icon, price)')
        .in('child_id', childIds)
        .order('created_at', { ascending: false });
      if (redemptionsData) setRedemptions(redemptionsData);
    } else {
      setSubmissions([]);
      setRedemptions([]);
    }

    const wishRes = await fetch(`/api/wishlist?parent_id=${profile.id}`);
    const wishData = await wishRes.json();
    if (wishData.requests) setWishlist(wishData.requests);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold">กำลังโหลด...</div>
      </div>
    );
  }

  if (!user) return null;

  const parentProfile = parent ?? user;

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  const pendingWishlist = wishlist.filter(w => w.status === 'pending');

  const tabs = [
    { id: 'overview' as const, label: 'ภาพรวม', icon: '📊' },
    { id: 'review' as const, label: 'ตรวจ', icon: '✅' },
    { id: 'missions' as const, label: 'ภารกิจ', icon: '📋' },
    { id: 'shop' as const, label: 'ร้าน', icon: '🛒' },
    { id: 'history' as const, label: 'ประวัติ', icon: '📜' },
    { id: 'settings' as const, label: 'อื่นๆ', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <div className="p-4 card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {parentProfile.avatar_url ? (
              <StorageImage
                src={parentProfile.avatar_url}
                alt="Profile"
                className="rounded-full object-cover"
                style={{ width: 48, height: 48 }}
                fallback={<span className="text-3xl">{parentProfile.avatar || '👨'}</span>}
              />
            ) : (
              <span className="text-3xl">{parentProfile.avatar || '👨'}</span>
            )}
            <div>
              <h2 className="text-xl font-bold">ภาพรวม</h2>
              <p className="muted">{parentProfile.username}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-sm btn-ghost">
            ออก
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl" style={{ background: 'var(--cream)' }}>
            <p className="text-2xl font-bold">{children.length}</p>
            <p className="muted text-sm">เด็ก</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--cream)' }}>
            <p className="text-2xl font-bold">{pendingSubmissions.length}</p>
            <p className="muted text-sm">รอตรวจ</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--cream)' }}>
            <p className="text-2xl font-bold">{pendingRedemptions.length}</p>
            <p className="muted text-sm">รอจัดให้</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--cream)' }}>
            <p className="text-2xl font-bold">{pendingWishlist.length}</p>
            <p className="muted text-sm">ขอของรางวัล</p>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === 'overview' && (
          <OverviewTab
            children={children}
            onRefresh={() => parentProfile && fetchParentData(parentProfile)}
          />
        )}
        {activeTab === 'review' && (
          <ReviewTab
            submissions={submissions}
            redemptions={redemptions}
            wishlist={wishlist}
            children={children}
            onRefresh={() => parentProfile && fetchParentData(parentProfile)}
          />
        )}
        {activeTab === 'missions' && (
          <MissionsTab children={children} />
        )}
        {activeTab === 'shop' && (
          <ShopTab />
        )}
        {activeTab === 'history' && (
          <ParentHistoryTab children={children} submissions={submissions} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab parent={parentProfile} children={children} />
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function OverviewTab({
  children,
  onRefresh,
}: {
  children: User[];
  onRefresh: () => void;
}) {
  const [penaltyChildId, setPenaltyChildId] = useState('');
  const [penaltyReason, setPenaltyReason] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [submittingPenalty, setSubmittingPenalty] = useState(false);

  useEffect(() => {
    if (children.length > 0 && !penaltyChildId) {
      setPenaltyChildId(children[0].id);
    }
  }, [children, penaltyChildId]);

  async function handlePenaltySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!penaltyChildId || !penaltyReason.trim()) return;

    const amount = penaltyAmount ? Math.max(0, parseInt(penaltyAmount, 10) || 0) : 0;

    setSubmittingPenalty(true);
    showAlert({ title: 'กำลังบันทึก...', icon: 'loading', showConfirmButton: false });

    try {
      const res = await fetchWithAuth('/api/children/penalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: penaltyChildId,
          reason: penaltyReason.trim(),
          amount,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        hideAlert();
        showAlert({
          title: 'บันทึกไม่สำเร็จ',
          text: data.error || 'กรุณาลองใหม่',
          icon: 'error',
        });
        return;
      }

      setPenaltyReason('');
      setPenaltyAmount('');
      onRefresh();
      hideAlert();
      showAlert({
        title: amount > 0 ? 'ตักเตือนและหักเหรียญแล้ว' : 'ส่งข้อความตักเตือนแล้ว',
        text: amount > 0
          ? `หัก ${amount} 🪙 แล้ว ลูกจะเห็นในประวัติเหรียญ`
          : 'ลูกจะเห็นข้อความในประวัติเหรียญ',
        icon: 'success',
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      hideAlert();
      showAlert({
        title: 'บันทึกไม่สำเร็จ',
        text: err instanceof Error ? err.message : 'กรุณาลองใหม่',
        icon: 'error',
      });
    } finally {
      setSubmittingPenalty(false);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-3">👨‍👩‍👧‍👦 ลูกของคุณ</h3>
      {children.length === 0 ? (
        <p className="muted text-center py-8">ยังไม่มีเด็ก</p>
      ) : (
        <div className="space-y-3">
          {children.map(child => (
            <div key={child.id} className="card">
              <div className="flex items-center gap-3">
                {child.avatar_url ? (
                  <StorageImage
                    src={child.avatar_url}
                    alt={child.username}
                    className="rounded-full object-cover"
                    style={{ width: 48, height: 48 }}
                    fallback={<span className="text-4xl">{child.avatar || '🐯'}</span>}
                  />
                ) : (
                  <span className="text-4xl">{child.avatar || '🐯'}</span>
                )}
                <div className="flex-1">
                  <p className="font-bold">{child.username}</p>
                  <div className="flex gap-3 text-sm">
                    <span>🪙 {child.coins}</span>
                    <span>⭐ Level {child.xp > 0 ? Math.floor(child.xp / 50) + 1 : 1}</span>
                    <span>🔥 {child.streak}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {children.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-bold mb-2">⚠️ ตักเตือน / หักคะแนน</h3>
          <p className="muted text-sm mb-3">
            สื่อสารประเด็นที่อยากบอกลูก — ใส่ข้อความตักเตือน และหักเหรียญได้ (ไม่บังคับ)
          </p>
          <form onSubmit={handlePenaltySubmit}>
            <div className="field">
              <label className="field-label">เลือกลูก</label>
              <select
                className="w-full p-3 rounded-xl border-2"
                style={{ borderColor: 'var(--line)' }}
                value={penaltyChildId}
                onChange={(e) => setPenaltyChildId(e.target.value)}
                required
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.avatar} {child.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">ข้อความตักเตือน</label>
              <input
                type="text"
                className="w-full p-3 rounded-xl border-2"
                style={{ borderColor: 'var(--line)' }}
                value={penaltyReason}
                onChange={(e) => setPenaltyReason(e.target.value)}
                placeholder="เช่น พูดไม่สุภาพ, ไม่ทำตามที่ตกลง"
                required
              />
            </div>
            <div className="field">
              <label className="field-label">หักเหรียญ (ไม่บังคับ)</label>
              <input
                type="number"
                className="w-full p-3 rounded-xl border-2"
                style={{ borderColor: 'var(--line)' }}
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(e.target.value)}
                placeholder="เช่น 20 — ว่างไว้ถ้าแค่ตักเตือน"
                min={0}
              />
            </div>
            <button
              type="submit"
              className="btn btn-danger btn-block"
              disabled={submittingPenalty}
            >
              {submittingPenalty ? 'กำลังบันทึก...' : 'ส่งตักเตือน'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ReviewTab({
  submissions,
  redemptions,
  wishlist,
  children,
  onRefresh,
}: {
  submissions: Submission[];
  redemptions: Redemption[];
  wishlist: WishlistRequest[];
  children: User[];
  onRefresh: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [showReject, setShowReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [penalty, setPenalty] = useState(0);
  const [applyPenalty, setApplyPenalty] = useState(true);
  const [wishPrices, setWishPrices] = useState<Record<string, number>>({});

  const childMap = Object.fromEntries(children.map(c => [c.id, c]));
  const [missionMap, setMissionMap] = useState<Record<string, any>>({});
  const [shopItemMap, setShopItemMap] = useState<Record<string, ShopItem>>({});

  useEffect(() => {
    async function loadShopItems() {
      const itemIds = [...new Set(redemptions.map((r) => r.item_id))];
      if (itemIds.length === 0) return;

      const embedded = redemptions
        .filter((r) => r.shop_items?.name)
        .reduce<Record<string, ShopItem>>((acc, r) => {
          acc[r.item_id] = {
            id: r.item_id,
            name: r.shop_items!.name,
            icon: r.shop_items!.icon,
            price: r.shop_items!.price ?? 0,
          } as ShopItem;
          return acc;
        }, {});

      const missingIds = itemIds.filter((id) => !embedded[id]);
      if (missingIds.length === 0) {
        setShopItemMap(embedded);
        return;
      }

      const { data } = await supabase
        .from('shop_items')
        .select('*')
        .in('id', missingIds);

      const map: Record<string, ShopItem> = { ...embedded };
      (data ?? []).forEach((item: ShopItem) => {
        map[item.id] = item;
      });
      setShopItemMap(map);
    }
    loadShopItems();
  }, [redemptions]);

  useEffect(() => {
    async function loadMissions() {
      const missionIds = [...new Set(submissions.map(s => s.mission_id))];
      if (missionIds.length === 0) return;
      const { data } = await supabase
        .from('missions')
        .select('id, title, icon')
        .in('id', missionIds);
      if (data) {
        const map: Record<string, any> = {};
        data.forEach((m: any) => { map[m.id] = m; });
        setMissionMap(map);
      }
    }
    loadMissions();
  }, [submissions]);

  async function handleApprove(subId: string) {
    if (!user) return;

    showAlert({ title: 'กำลังอนุมัติ...', icon: 'loading', showConfirmButton: false });

    try {
      const res = await fetchWithAuth(`/api/submissions/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();

      if (!res.ok) {
        hideAlert();
        showAlert({ title: 'อนุมัติไม่สำเร็จ', text: data.error || 'กรุณาลองใหม่', icon: 'error' });
        return;
      }

      await onRefresh();
      hideAlert();
      showAlert({
        title: 'อนุมัติแล้ว!',
        text: `ให้รางวัล +${data.coins_awarded} 🪙`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      hideAlert();
      showAlert({
        title: 'อนุมัติไม่สำเร็จ',
        text: err instanceof Error ? err.message : 'กรุณาลองใหม่',
        icon: 'error',
      });
    }
  }

  async function handleReject(subId: string) {
    if (!user) return;

    showAlert({ title: 'กำลังบันทึก...', icon: 'loading', showConfirmButton: false });

    try {
      const res = await fetchWithAuth(`/api/submissions/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          penalty: applyPenalty ? penalty : 0,
          reject_reason: rejectReason,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        hideAlert();
        showAlert({ title: 'บันทึกไม่สำเร็จ', text: data.error || 'กรุณาลองใหม่', icon: 'error' });
        return;
      }

      setShowReject(null);
      setRejectReason('');
      setPenalty(0);
      await onRefresh();
      hideAlert();
      showAlert({
        title: 'บันทึกแล้ว',
        text: 'ปฏิเสธภารกิจแล้ว',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      hideAlert();
      showAlert({
        title: 'บันทึกไม่สำเร็จ',
        text: err instanceof Error ? err.message : 'กรุณาลองใหม่',
        icon: 'error',
      });
    }
  }

  async function handleWishApprove(wishId: string) {
    if (!user) return;
    const price = wishPrices[wishId] ?? 100;
    const res = await fetch(`/api/wishlist/${wishId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', approved_price: price, approved_by: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert({ title: 'อนุมัติไม่สำเร็จ', text: data.error || 'กรุณาลองใหม่', icon: 'error' });
      return;
    }
    await onRefresh();
  }

  async function handleWishReject(wishId: string) {
    if (!user) return;
    const res = await fetch(`/api/wishlist/${wishId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', approved_by: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert({ title: 'ปฏิเสธไม่สำเร็จ', text: data.error || 'กรุณาลองใหม่', icon: 'error' });
      return;
    }
    await onRefresh();
  }

  const pendingSubs = submissions.filter(s => s.status === 'pending');
  const pendingWishes = wishlist.filter(w => w.status === 'pending');

  return (
    <div>
      {/* Wishlist requests */}
      <h3 className="text-lg font-bold mb-3">🌟 คำขอของรางวัล ({pendingWishes.length})</h3>
      {pendingWishes.length === 0 ? (
        <p className="muted text-center py-4 mb-6">ไม่มีคำขอใหม่</p>
      ) : (
        pendingWishes.map(wish => {
          const child = childMap[wish.child_id];
          return (
            <div key={wish.id} className="card mb-3">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{wish.icon || '🎁'}</span>
                <div className="flex-1">
                  <p className="font-bold">{wish.item_name}</p>
                  <p className="muted text-sm">
                    {child ? `${child.avatar} ${child.username}` : 'ลูก'} •
                    {wish.suggested_price ? ` เสนอ ${wish.suggested_price} 🪙` : ' ไม่ระบุราคา'}
                  </p>
                </div>
              </div>
              <div className="field mb-2">
                <label className="field-label">ตั้งราคา (เหรียญ)</label>
                <input
                  type="number"
                  className="w-full p-3 rounded-xl border-2"
                  style={{ borderColor: 'var(--line)' }}
                  value={wishPrices[wish.id] ?? wish.suggested_price ?? 100}
                  onChange={(e) => setWishPrices(prev => ({
                    ...prev,
                    [wish.id]: parseInt(e.target.value) || 0,
                  }))}
                  min={1}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm flex-1"
                  onClick={() => handleWishApprove(wish.id)}
                >
                  ✅ อนุมัติ + ใส่ร้าน
                </button>
                <button
                  className="btn btn-danger btn-sm flex-1"
                  onClick={() => handleWishReject(wish.id)}
                >
                  ❌ ไม่อนุมัติ
                </button>
              </div>
            </div>
          );
        })
      )}

      <h3 className="text-lg font-bold mb-3 mt-6">✅ ภารกิจรอตรวจ ({pendingSubs.length})</h3>
      
      {pendingSubs.length === 0 ? (
        <p className="muted text-center py-8">ไม่มีภารกิจรอตรวจ 🎉</p>
      ) : (
        pendingSubs.map(sub => (
          <div key={sub.id} className="card mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {missionMap[sub.mission_id]?.icon || childMap[sub.child_id]?.avatar || '📋'}
                </span>
                <div>
                  <p className="font-bold">
                    {missionMap[sub.mission_id]?.title || sub.note || 'ภารกิจ'}
                  </p>
                  <p className="muted text-sm">
                    {childMap[sub.child_id]?.avatar} {childMap[sub.child_id]?.username || 'ลูก'} •{' '}
                    {new Date(sub.submission_date).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>
              <span className="pill st-pending">รอตรวจ</span>
            </div>

            {/* Evidence Images */}
            {sub.evidence_urls && sub.evidence_urls.length > 0 && (
              <div className="evidence-grid mb-3">
                {sub.evidence_urls.map((url, idx) => (
                  <img key={idx} src={url} alt={`Evidence ${idx + 1}`} className="evidence-thumb" />
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                className="btn btn-primary btn-sm flex-1"
                onClick={() => handleApprove(sub.id)}
              >
                ✅ ผ่าน ให้รางวัล
              </button>
              <button
                className="btn btn-danger btn-sm flex-1"
                onClick={() => setShowReject(sub.id)}
              >
                ❌ ไม่ผ่าน
              </button>
            </div>

            {showReject === sub.id && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--cream)' }}>
                <div className="field mb-2">
                  <label className="field-label">เหตุผล (ไม่จำเป็น)</label>
                  <textarea
                    className="w-full p-3 rounded-xl border-2"
                    style={{ borderColor: 'var(--line)' }}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="เหตุผลในการไม่ผ่าน"
                    rows={2}
                  />
                </div>
                <div className="field mb-2">
                  <label className="field-label">หักเหรียญ</label>
                  <div className="flex items-center gap-2">
                    <label className="checkbox-label" style={{ color: 'var(--body)', fontSize: '14px' }}>
                      <input
                        type="checkbox"
                        checked={applyPenalty}
                        onChange={(e) => setApplyPenalty(e.target.checked)}
                      />
                      <span>ตองการหักเหรียญ</span>
                    </label>
                  </div>
                </div>
                {applyPenalty && (
                  <div className="field mb-2">
                    <label className="field-label">จำนวนทหี่ ัก</label>
                    <input
                      type="number"
                      className="w-full p-3 rounded-xl border-2"
                      style={{ borderColor: 'var(--line)' }}
                      value={penalty}
                      onChange={(e) => setPenalty(parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    className="btn btn-danger btn-sm flex-1"
                    onClick={() => handleReject(sub.id)}
                  >
                    ยืนยันไม่ผ่าน
                  </button>
                  <button
                    className="btn btn-ghost btn-sm flex-1"
                    onClick={() => setShowReject(null)}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Redemptions */}
      <h3 className="text-lg font-bold mb-3 mt-6">🎁 การแลกของรางวัล</h3>
      {redemptions.filter(r => r.status === 'pending').length === 0 ? (
        <p className="muted text-center py-4">ไม่มีคำขอแลกของรางวัล</p>
      ) : (
        redemptions.filter(r => r.status === 'pending').map(redemption => {
          const child = childMap[redemption.child_id];
          const item = shopItemMap[redemption.item_id] || redemption.shop_items;
          return (
        <div key={redemption.id} className="card mb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-3xl">{item?.icon || '🎁'}</span>
              <div>
                <p className="font-bold">{item?.name || 'ของรางวัล'}</p>
                <p className="muted text-sm">
                  {child ? `${child.avatar} ${child.username}` : 'ลูก'} • {item?.price ?? '?'} 🪙
                </p>
                <p className="muted text-sm">
                  ขอเมื่อ {new Date(redemption.created_at).toLocaleDateString('th-TH')}
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm shrink-0"
              onClick={async () => {
                await supabase.from('redemptions').update({
                  status: 'fulfilled',
                  fulfilled_at: new Date().toISOString(),
                }).eq('id', redemption.id);
                await onRefresh();
              }}
            >
              ✅ จัดให้แล้ว
            </button>
          </div>
        </div>
          );
        })
      )}
    </div>
  );
}

function MissionsTab({ children }: { children: User[] }) {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📋');
  const [type, setType] = useState<'daily' | 'special'>('daily');
  const [deadline, setDeadline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [targetChildId, setTargetChildId] = useState('');
  const [coin, setCoin] = useState(10);
  const [xp, setXp] = useState(10);

  useEffect(() => {
    fetchMissions();
  }, []);

  async function fetchMissions() {
    const { data } = await supabase
      .from('missions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setMissions(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingId) {
      const { error } = await supabase
        .from('missions')
        .update({
          title, icon, type,
          deadline: deadline || null,
          start_date: startDate || null,
          end_date: endDate || null,
          recurring_days: recurringDays.length > 0 ? recurringDays : null,
          coin_reward: coin,
          xp_reward: xp,
          attachments: attachments.length > 0 ? attachments : null,
          target_child_id: targetChildId || null,
        })
        .eq('id', editingId);
      if (error) showAlert({ title: 'แก้ไขไม่สำเร็จ', text: error.message, icon: 'error' });
      else showAlert({ title: 'บันทึกแล้ว', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
      const { error } = await supabase.from('missions').insert({
        title,
        icon,
        type,
        deadline: deadline || null,
        start_date: startDate || null,
        end_date: endDate || null,
        recurring_days: recurringDays.length > 0 ? recurringDays : null,
        coin_reward: coin,
        xp_reward: xp,
        created_by: user!.id,
        attachments: attachments.length > 0 ? attachments : null,
        target_child_id: targetChildId || null,
      });
      if (error) showAlert({ title: 'สร้างไม่สำเร็จ', text: error.message, icon: 'error' });
      else showAlert({ title: 'สร้างภารกิจแล้ว', icon: 'success', timer: 1500, showConfirmButton: false });
    }

    setShowForm(false);
    setEditingId(null);
    setTitle('');
    setIcon('📋');
    setType('daily');
    setDeadline('');
    setStartDate('');
    setEndDate('');
    setRecurringDays([]);
    setAttachments([]);
    setTargetChildId('');
    setCoin(10);
    setXp(10);
    fetchMissions();
  }

  async function handleToggle(id: string, active: boolean) {
    await supabase.from('missions').update({ active: !active }).eq('id', id);
    fetchMissions();
  }

  async function handleDelete(id: string) {
    if (!confirm('ต้องการลบภารกิจนี้ใช่ไหม?')) return;
    await supabase.from('missions').delete().eq('id', id);
    fetchMissions();
  }

  function startEdit(mission: Mission) {
    setEditingId(mission.id);
    setTitle(mission.title);
    setIcon(mission.icon || '📋');
    setType(mission.type);
    setDeadline(mission.deadline || '');
    setStartDate(mission.start_date || '');
    setEndDate(mission.end_date || '');
    setRecurringDays(mission.recurring_days || []);
    setAttachments(mission.attachments || []);
    setTargetChildId(mission.target_child_id || '');
    setCoin(mission.coin_reward);
    setXp(mission.xp_reward);
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">📋 ภารกิจ</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          + เพิ่ม
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-3">
          <h4 className="font-bold mb-3">{editingId ? 'แก้ไข' : 'สร้างภารกิจใหม่'}</h4>
          
          <div className="field">
            <label className="field-label">ชื่อภารกิจ</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label">ไอคอน</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
            />
          </div>

          <div className="field">
            <label className="field-label">ประเภท</label>
            <select
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={type}
              onChange={(e) => setType(e.target.value as 'daily' | 'special')}
            >
              <option value="daily">ประจำวัน</option>
              <option value="special">พิเศษ</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">เดดไลน์ (ไม่จำเป็น)</label>
            <input
              type="time"
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">📅 วนทำซ้ำ (Recurring - ไม่จำเป็น)</label>
            <div className="flex flex-wrap gap-2">
              {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((day, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`btn btn-sm ${recurringDays.includes(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][idx]) ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
                    if (recurringDays.includes(days[idx])) {
                      setRecurringDays(recurringDays.filter(d => d !== days[idx]));
                    } else {
                      setRecurringDays([...recurringDays, days[idx]]);
                    }
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">📆 วนเริ่ มทำ (ไม่จำเป็น)</label>
            <input
              type="date"
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">📆 วนหมดกจิ (ไม่จำเป็น)</label>
            <input
              type="date"
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">👤 มอบหมายให้ (ไม่จำเป็น)</label>
            <select
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={targetChildId}
              onChange={(e) => setTargetChildId(e.target.value)}
            >
              <option value="">ลูกทุกคน</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.avatar} {child.username}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label">📎 แนบภาพ/ไฟล์ (ไม่จำเป็น)</label>
            <EvidenceUploader
              onUpload={(urls) => setAttachments(urls)}
              existingUrls={attachments}
              userId={user?.id}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="field-label">เหรียญ</label>
              <input
                type="number"
                className="w-full p-3 rounded-xl border-2"
                style={{ borderColor: 'var(--line)' }}
                value={coin}
                onChange={(e) => setCoin(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label className="field-label">XP</label>
              <input
                type="number"
                className="w-full p-3 rounded-xl border-2"
                style={{ borderColor: 'var(--line)' }}
                value={xp}
                onChange={(e) => setXp(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button type="submit" className="btn btn-primary btn-sm flex-1">
              บันทึก
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm flex-1"
              onClick={() => { setShowForm(false); setEditingId(null); }}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {missions.map(mission => (
        <div key={mission.id} className="card mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{mission.icon || '📋'}</span>
              <div>
                <p className="font-bold">{mission.title}</p>
                <p className="muted text-sm">
                  +{mission.coin_reward} 🪙 | +{mission.xp_reward} XP
                  {mission.deadline && ` | ⏰ ${mission.deadline}`}
                  {mission.target_child_id && (
                    <> | 👤 {children.find((c) => c.id === mission.target_child_id)?.username || 'ลูก'}</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => startEdit(mission)}
              >
                ✏️
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => handleToggle(mission.id, mission.active)}
              >
                {mission.active ? '🔘' : '⚫'}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(mission.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ParentHistoryTab({
  children,
  submissions,
}: {
  children: User[];
  submissions: Submission[];
}) {
  const [selectedChildId, setSelectedChildId] = useState('');
  const [coinHistory, setCoinHistory] = useState<CoinHistory[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [missionMap, setMissionMap] = useState<Record<string, Mission>>({});

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  useEffect(() => {
    if (!selectedChildId) return;

    async function loadHistory() {
      const [{ data: coins }, { data: redeems }] = await Promise.all([
        supabase
          .from('coin_history')
          .select('*')
          .eq('child_id', selectedChildId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('redemptions')
          .select('*, shop_items(name, icon, price)')
          .eq('child_id', selectedChildId)
          .order('created_at', { ascending: false }),
      ]);

      if (coins) setCoinHistory(coins);
      if (redeems) setRedemptions(redeems as Redemption[]);

      const childSubs = submissions.filter((s) => s.child_id === selectedChildId);
      const missionIds = [...new Set(childSubs.map((s) => s.mission_id))];
      if (missionIds.length === 0) {
        setMissionMap({});
        return;
      }

      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .in('id', missionIds);

      const map: Record<string, Mission> = {};
      (missions ?? []).forEach((m) => {
        map[m.id] = m;
      });
      setMissionMap(map);
    }

    loadHistory();
  }, [selectedChildId, submissions]);

  if (children.length === 0) {
    return <p className="muted text-center py-8">ยังไม่มีเด็กในครอบครัว</p>;
  }

  const childSubs = submissions
    .filter((s) => s.child_id === selectedChildId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const statusLabel: Record<Submission['status'], string> = {
    pending: '⏳ รอตรวจ',
    approved: '✅ ผ่าน',
    rejected: '❌ ไม่ผ่าน',
  };

  return (
    <div>
      <div className="field mb-4">
        <label className="field-label">เลือกลูก</label>
        <select
          className="w-full p-3 rounded-xl border-2"
          style={{ borderColor: 'var(--line)' }}
          value={selectedChildId}
          onChange={(e) => setSelectedChildId(e.target.value)}
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.avatar} {child.username}
            </option>
          ))}
        </select>
      </div>

      <h3 className="text-lg font-bold mb-3">📋 ประวัติภารกิจ</h3>
      {childSubs.length === 0 ? (
        <p className="muted text-center py-4 mb-6">ยังไม่มีการส่งภารกิจ</p>
      ) : (
        <div className="card mb-6">
          {childSubs.map((sub) => (
            <div key={sub.id} className="flex justify-between items-start py-3 border-b last:border-b-0" style={{ borderColor: 'var(--line)' }}>
              <div>
                <p className="font-bold">
                  {missionMap[sub.mission_id]?.icon || '📋'}{' '}
                  {missionMap[sub.mission_id]?.title || 'ภารกิจ'}
                </p>
                <p className="muted text-sm">
                  {new Date(sub.submission_date).toLocaleDateString('th-TH')}
                  {sub.reviewed_at && ` • ตรวจ ${new Date(sub.reviewed_at).toLocaleDateString('th-TH')}`}
                </p>
              </div>
              <span className="pill text-sm">{statusLabel[sub.status]}</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-lg font-bold mb-3">📜 ประวัติเหรียญ</h3>
      {coinHistory.length === 0 ? (
        <p className="muted text-center py-4 mb-6">ยังไม่มีประวัติเหรียญ</p>
      ) : (
        <div className="card mb-6">
          {coinHistory.map((h) => (
            <div key={h.id} className="flex justify-between items-center py-2">
              <div>
                <p className="font-bold">{h.reason}</p>
                <p className="muted text-sm">{new Date(h.created_at).toLocaleDateString('th-TH')}</p>
              </div>
              <span className={`font-bold ${h.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {h.delta > 0 ? '+' : ''}{h.delta} 🪙
              </span>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-lg font-bold mb-3">🎁 การแลกของรางวัล</h3>
      {redemptions.length === 0 ? (
        <p className="muted text-center py-4">ยังไม่มีการแลกของ</p>
      ) : (
        <div className="card">
          {redemptions.map((r) => (
            <div key={r.id} className="flex justify-between items-center py-2">
              <div>
                <p className="font-bold">
                  {r.shop_items?.icon || '🎁'} {r.shop_items?.name || 'ของรางวัล'}
                </p>
                <p className="muted text-sm">{new Date(r.created_at).toLocaleDateString('th-TH')}</p>
              </div>
              <span className={`pill ${r.status === 'fulfilled' ? 'st-approved' : 'st-pending'}`}>
                {r.status === 'fulfilled' ? '✅ จัดให้แล้ว' : '⏳ รอจัดให้'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShopTab() {
  const { user } = useAuth();
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎁');
  const [price, setPrice] = useState(100);

  useEffect(() => {
    fetchShopItems();
  }, []);

  async function fetchShopItems() {
    const { data } = await supabase
      .from('shop_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setShopItems(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingId) {
      await supabase.from('shop_items').update({ name, icon, price }).eq('id', editingId);
    } else {
      await supabase.from('shop_items').insert({
        name,
        icon,
        price,
        created_by: user!.id,
      });
    }

    setShowForm(false);
    setEditingId(null);
    setName('');
    setIcon('🎁');
    setPrice(100);
    fetchShopItems();
  }

  async function handleDelete(id: string) {
    if (!confirm('ต้องการลบของรางวัลนี้ใช่ไหม?')) return;
    await supabase.from('shop_items').delete().eq('id', id);
    fetchShopItems();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">🛒 ของรางวัล</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          + เพิ่ม
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-3">
          <h4 className="font-bold mb-3">{editingId ? 'แก้ไข' : 'สร้างของรางวัลใหม่'}</h4>
          
          <div className="field">
            <label className="field-label">ชื่อของรางวัล</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label">ไอคอน</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
            />
          </div>

          <div className="field">
            <label className="field-label">ราคา (เหรียญ)</label>
            <input
              type="number"
              className="w-full p-3 rounded-xl border-2"
              style={{ borderColor: 'var(--line)' }}
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              required
            />
          </div>

          <div className="flex gap-2 mt-3">
            <button type="submit" className="btn btn-primary btn-sm flex-1">
              บันทึก
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm flex-1"
              onClick={() => { setShowForm(false); setEditingId(null); }}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {shopItems.map(item => (
        <div key={item.id} className="card mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{item.icon || '🎁'}</span>
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="muted text-sm">{item.price} 🪙</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(item.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({ parent, children }: { parent: User; children: User[] }) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [newChildPassword, setNewChildPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [parentAvatarUrl, setParentAvatarUrl] = useState(parent.avatar_url || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('notifications_enabled') === 'true';
    }
    return true;
  });

  useEffect(() => {
    if (!parent.id) return;
    fetch(`/api/family?user_id=${parent.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.family) {
          setInviteCode(data.family.invite_code);
          setFamilyName(data.family.name);
        }
      })
      .catch(() => {});

    fetchWithAuth('/api/admin/me')
      .then((res) => res.json())
      .then((data) => setIsAppAdmin(Boolean(data.isAdmin)))
      .catch(() => setIsAppAdmin(false));
  }, [parent.id]);

  function copyCode() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleNotifications() {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('notifications_enabled', String(newValue));
    
    if (newValue && 'Notification' in window) {
      Notification.requestPermission().then(perm => {
        if (perm !== 'granted') {
          showAlert({
            title: 'ไม่สามารถส่งเตือนได้',
            text: 'การแจ้งเตือนถูกปิดในการตั้งค่าเบราว์เซอร์',
            icon: 'warning',
          });
          setNotificationsEnabled(false);
          localStorage.setItem('notifications_enabled', 'false');
        }
      });
    }
  }

  async function handleChangeChildPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChildId || !newChildPassword) return;

    setChangingPassword(true);
    showAlert({ title: 'กำลังเปลี่ยนรหัส...', icon: 'loading', showConfirmButton: false });

    try {
      const res = await fetchWithAuth('/api/auth/change-child-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: selectedChildId,
          new_password: newChildPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        hideAlert();
        showAlert({ title: 'เปลี่ยนรหัสไม่สำเร็จ', text: data.error || 'กรุณาลองใหม่', icon: 'error' });
        return;
      }

      setNewChildPassword('');
      hideAlert();
      showAlert({
        title: 'เปลี่ยนรหัสแล้ว',
        text: 'เด็กสามารถใช้รหัสใหม่เข้าสู่ระบบได้',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      hideAlert();
      showAlert({
        title: 'เปลี่ยนรหัสไม่สำเร็จ',
        text: err instanceof Error ? err.message : 'กรุณาลองใหม่',
        icon: 'error',
      });
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-3">⚙️ อื่นๆ</h3>

      <div className="card mb-3">
        <h4 className="font-bold mb-2">👨‍👩‍👧 ครอบครัว</h4>
        {familyName && <p className="muted text-sm mb-2">{familyName}</p>}
        {inviteCode ? (
          <>
            <p className="text-sm mb-2">รหัสเชิญให้พ่อ/แม่อีกคนเข้าร่วม:</p>
            <div className="flex items-center gap-2">
              <code className="text-2xl font-bold tracking-widest px-4 py-2 rounded-xl" style={{ background: 'var(--cream)', filter: showCode ? 'none' : 'blur(8px)', userSelect: showCode ? 'auto' : 'none', transition: 'filter 0.3s ease' }}>
                {showCode ? inviteCode : '••••••'}
              </code>
              <button className="btn btn-sm btn-primary" onClick={() => setShowCode(!showCode)}>
                {showCode ? '🙈 บด' : '👁 เผย'}
              </button>
              <button className="btn btn-sm btn-primary" onClick={copyCode}>
                {copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>
            <p className="muted text-sm mt-2">ให้แม่/พ่อสมัคร → เลือก &quot;เข้าร่วมครอบครัว&quot; → ใส่รหัสนี้</p>
          </>
        ) : (
          <p className="muted text-sm">กำลังโหลดรหัสเชิญ... (ถ้าไม่ขึ้น ให้รัน SQL migration v2 ใน Supabase)</p>
        )}
      </div>

      <div className="card mb-3">
        <h4 className="font-bold mb-3">👤 รูปโปรไฟล์ของคุณ</h4>
        <ProfileAvatarEditor
          userId={parent.id}
          emoji={parent.avatar || '👨'}
          avatarUrl={parentAvatarUrl}
          onUpdated={setParentAvatarUrl}
        />
      </div>

      <div className="card mb-3">
        <h4 className="font-bold mb-2">🔐 เปลี่ยนรหัสผ่านเด็ก</h4>
        <p className="muted text-sm mb-3">ตั้งรหัสใหม่ให้ลูกในครอบครัว (ใช้แทน PIN เดิม)</p>
        {children.length === 0 ? (
          <p className="muted text-sm">ยังไม่มีบัญชีเด็ก</p>
        ) : (
          <form onSubmit={handleChangeChildPassword}>
            <div className="field">
              <label className="field-label">เลือกลูก</label>
              <select
                className="w-full p-3 rounded-xl border-2"
                style={{ borderColor: 'var(--line)' }}
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                required
              >
                <option value="">-- เลือกลูก --</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.avatar} {child.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">รหัสผ่านใหม่</label>
              <input
                type="password"
                className="w-full p-3 rounded-xl border-2"
                style={{ borderColor: 'var(--line)' }}
                value={newChildPassword}
                onChange={(e) => setNewChildPassword(e.target.value)}
                minLength={4}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={changingPassword}>
              {changingPassword ? 'กำลังบันทึก...' : 'บันทึกรหัสใหม่'}
            </button>
          </form>
        )}
      </div>

      <div className="card mb-3">
        <h4 className="font-bold mb-2">🛡️ ความปลอดภัย</h4>
        <p className="muted text-sm mb-2">
          ใครที่รู้ URL ก็สมัครได้ — ถ้าเจอครอบครัวที่ไม่รู้จัก ผู้ดูแลระบบสามารถปิดการใช้งานได้
        </p>
        {isAppAdmin && (
          <Link href="/dashboard/admin" className="btn btn-primary btn-sm mb-3 inline-block">
            🛡️ จัดการผู้ใช้ / เปิด-ปิดครอบครัว
          </Link>
        )}
        <p className="muted text-sm">
          ตั้ง <code>APP_ADMIN_USERNAMES=ชื่อผู้ใช้ของคุณ</code> ใน Vercel เพื่อเข้าหน้านี้
        </p>
      </div>

      <div className="card mb-3">
        <h4 className="font-bold mb-2">📥 Export/Import Data</h4>
        <p className="muted text-sm mb-3">ส่งออกหรือนำเข้าข้อมูลจากไฟล์ JSON</p>
        <button className="btn btn-ghost btn-sm">Export JSON</button>
      </div>

      <div className="card">
        <h4 className="font-bold mb-2">ℹ️ เกี่ยวกับแอป</h4>
        <p className="muted text-sm">Family Quest v2.0</p>
        <p className="muted text-sm">ครอบครัว • Wishlist • พี่น้องแข่งขัน</p>
      </div>

      <div className="card mt-3">
        <h4 className="font-bold mb-2">🔔 การแจ้งเตือน</h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">ส่งการแจ้งเตือนใน App</p>
            <p className="muted text-sm">เตือนเมื่ อภารกิตใกลหมดเวลา</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={toggleNotifications}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
