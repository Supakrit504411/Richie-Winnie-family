'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fetchWithAuth } from '@/lib/api-client';
import { User, Mission, Submission, WishlistRequest } from '@/lib/types';
import { CHAR_LEVELS, HOUSE_LEVELS, CAR_LEVELS, charLevelInfo, fmtCoin } from '@/lib/utils';
import { submissionStatusEmoji } from '@/lib/family';
import { showAlert, hideAlert } from '@/components/SweetAlert';
import ProfileAvatarEditor from '@/components/ProfileAvatarEditor';
import StorageImage from '@/components/StorageImage';

export default function ChildDashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'quests' | 'shop' | 'history'>('home');
  const [child, setChild] = useState<User | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [siblings, setSiblings] = useState<User[]>([]);
  const [siblingSubmissions, setSiblingSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    hideAlert();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (user.role !== 'child') {
      router.push('/dashboard/parent');
      return;
    }
    setChild(user);
    fetchChildData(user);
  }, [user, loading, router]);

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  async function refreshProfile(userId: string) {
    const { data: freshProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (freshProfile) setChild(freshProfile);
    return freshProfile;
  }

  async function fetchChildData(profile: User) {
    await refreshProfile(profile.id);

    const membersRes = await fetchWithAuth('/api/family/members?role=child');
    const membersData = await membersRes.json();
    const siblingsData = membersRes.ok
      ? (membersData.members as User[]).filter(s => s.id !== profile.id)
      : [];

    if (siblingsData.length > 0) {
      setSiblings(siblingsData);

      const siblingIds = siblingsData.map(s => s.id);
      if (siblingIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const { data: sibSubs } = await supabase
          .from('submissions')
          .select('*')
          .in('child_id', siblingIds)
          .eq('submission_date', today);
        if (sibSubs) setSiblingSubmissions(sibSubs);
      }
    }

    const { data: missionsData } = await supabase
      .from('missions')
      .select('*')
      .eq('active', true);

    if (missionsData) {
      setMissions(
        missionsData.filter(
          (m) => !m.target_child_id || m.target_child_id === profile.id
        )
      );
    }

    const { data: subsData } = await supabase
      .from('submissions')
      .select('*')
      .eq('child_id', profile.id)
      .order('created_at', { ascending: false });

    if (subsData) setSubmissions(subsData);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPenalties } = await supabase
      .from('coin_history')
      .select('*')
      .eq('child_id', profile.id)
      .eq('kind', 'penalty')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    const latestPenalty = recentPenalties?.[0];
    if (latestPenalty && typeof window !== 'undefined') {
      const seenKey = `penalty_seen_${latestPenalty.id}`;
      if (!localStorage.getItem(seenKey)) {
        localStorage.setItem(seenKey, '1');
        showAlert({
          title: '⚠️ พ่อแม่มีข้อความถึงคุณ',
          text: latestPenalty.reason,
          icon: 'warning',
        });
      }
    }
  }

  // Check for upcoming deadlines and show notifications
  useEffect(() => {
    if (!missions || missions.length === 0) return;

    const notificationsEnabled = localStorage.getItem('notifications_enabled') === 'true';
    if (!notificationsEnabled) return;

    // Request notification permission on first load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkDeadlines = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      missions.forEach(mission => {
        if (!mission.deadline) return;

        // Skip if already submitted today
        const today = now.toISOString().split('T')[0];
        const hasSubmitted = submissions.some(
          s => s.mission_id === mission.id && s.submission_date === today
        );
        if (hasSubmitted) return;

        // Check if deadline is within 15 minutes
        const [deadlineHour, deadlineMinute] = mission.deadline.split(':').map(Number);
        const diffMinutes = (deadlineHour - currentHour) * 60 + (deadlineMinute - currentMinute);

        if (diffMinutes === 15 || diffMinutes === 5) {
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 Family Quest - เตอนใกล้หมดเวลา!', {
              body: `"${mission.title}" หมดเวลาอีก ${diffMinutes} นาที`,
              icon: '📋',
              tag: `deadline-${mission.id}-${today}`,
            });
          }
        }
      });
    };

    // Check immediately
    checkDeadlines();

    // Check every 30 seconds
    const interval = setInterval(checkDeadlines, 30000);

    return () => clearInterval(interval);
  }, [missions, submissions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold">กำลังโหลด...</div>
      </div>
    );
  }

  if (!user) return null;

  const childProfile = child ?? user;

  const levelInfo = charLevelInfo(childProfile.xp);

  const tabs = [
    { id: 'home' as const, label: 'บ้าน', icon: '🏠' },
    { id: 'quests' as const, label: 'ภารกิจ', icon: '📋' },
    { id: 'shop' as const, label: 'ร้าน', icon: '🛒' },
    { id: 'history' as const, label: 'ประวัติ', icon: '📜' },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <div className="p-4 card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {childProfile.avatar_url ? (
              <StorageImage
                src={childProfile.avatar_url}
                alt="Profile"
                className="rounded-full object-cover"
                style={{ width: 56, height: 56 }}
                fallback={<span className="text-4xl">{childProfile.avatar || '🐯'}</span>}
              />
            ) : (
              <span className="text-4xl">{childProfile.avatar || '🐯'}</span>
            )}
            <div>
              <h2 className="text-xl font-bold">{childProfile.username}</h2>
              <p className="muted">Level {levelInfo.level}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-sm btn-ghost">
            ออก
          </button>
        </div>

        {/* XP Progress */}
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span>EXP: {childProfile.xp}</span>
            <span>{levelInfo.next ? `Next: ${levelInfo.next.xp}` : 'Max!'}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3">
          <div className="pill">🪙 {fmtCoin(childProfile.coins)}</div>
          <div className="pill">🔥 {childProfile.streak} วัน</div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === 'home' && (
          <HomeTab
            child={childProfile}
            levelInfo={levelInfo}
            siblings={siblings}
            onProfileUpdated={(url) => setChild((prev) => prev ? { ...prev, avatar_url: url } : prev)}
          />
        )}
        {activeTab === 'quests' && (
          <QuestsTab
            missions={missions}
            submissions={submissions}
            childId={user.id}
            siblings={siblings}
            siblingSubmissions={siblingSubmissions}
            onRefresh={() => fetchChildData(childProfile)}
          />
        )}
        {activeTab === 'shop' && (
          <ShopTab
            childId={user.id}
            userCoins={childProfile.coins}
            onCoinsChange={(coins) => setChild((prev) => prev ? { ...prev, coins } : prev)}
            onGoToQuests={() => setActiveTab('quests')}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab childId={user.id} />
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

function HomeTab({
  child,
  levelInfo,
  siblings,
  onProfileUpdated,
}: {
  child: User;
  levelInfo: ReturnType<typeof charLevelInfo>;
  siblings: User[];
  onProfileUpdated?: (url: string) => void;
}) {
  const house = HOUSE_LEVELS.find(h => h.level === child.house_level) || HOUSE_LEVELS[0];
  const car = CAR_LEVELS.find(c => c.level === child.car_level) || CAR_LEVELS[0];

  const allKids = [child, ...siblings].sort((a, b) => b.coins - a.coins || b.xp - a.xp);

  return (
    <div>
      <div className="card mb-4">
        <h3 className="text-lg font-bold mb-3">👤 โปรไฟล์ของฉัน</h3>
        <ProfileAvatarEditor
          userId={child.id}
          emoji={child.avatar || '🐯'}
          avatarUrl={child.avatar_url}
          onUpdated={onProfileUpdated}
          size="sm"
        />
      </div>

      {/* Sibling leaderboard */}
      {allKids.length > 1 && (
        <div className="card mb-4">
          <h3 className="text-lg font-bold mb-3">🏆 อันดับในครอบครัว</h3>
          <div className="space-y-2">
            {allKids.map((kid, idx) => (
              <div
                key={kid.id}
                className="flex items-center gap-3 p-2 rounded-xl"
                style={{
                  background: kid.id === child.id ? 'var(--cream)' : 'transparent',
                  border: kid.id === child.id ? '2px solid var(--coral)' : 'none',
                }}
              >
                <span className="text-xl w-8 text-center">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                </span>
                <span className="text-2xl">{kid.avatar || '🐯'}</span>
                <div className="flex-1">
                  <p className="font-bold">
                    {kid.username}
                    {kid.id === child.id && ' (คุณ)'}
                  </p>
                  <p className="muted text-sm">
                    🪙 {fmtCoin(kid.coins)} • ⭐ {charLevelInfo(kid.xp).level} • 🔥 {kid.streak} วัน
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mb-4">
        <h3 className="text-lg font-bold mb-3">🏡 โรงเรือนของคุณ</h3>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-5xl mb-2">{house.emoji}</div>
            <p className="font-bold">{house.name}</p>
            <p className="muted text-sm">Level {child.house_level}</p>
          </div>
          <div className="text-3xl">➡️</div>
          <div className="text-center">
            <div className="text-5xl mb-2">{car.emoji}</div>
            <p className="font-bold">{car.name}</p>
            <p className="muted text-sm">Level {child.car_level}</p>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="card">
        <h3 className="text-lg font-bold mb-2">🔥 Streak</h3>
        <p className="text-3xl font-bold">{child.streak} วัน</p>
        <p className="muted mt-2">
          {child.streak > 0
            ? 'ทำภารกิจได้ติดต่อกัน! เก่งมาก!'
            : 'เริ่มทำภารกิจประจำวัน เพื่อบันทึกสเตรค!'}
        </p>
      </div>
    </div>
  );
}

function QuestsTab({
  missions,
  submissions,
  childId,
  siblings,
  siblingSubmissions,
  onRefresh,
}: {
  missions: Mission[];
  submissions: Submission[];
  childId: string;
  siblings: User[];
  siblingSubmissions: Submission[];
  onRefresh: () => Promise<void>;
}) {
  const [showSubmit, setShowSubmit] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(missionId: string) {
    if (!childId) return;

    setUploading(true);
    showAlert({
      title: 'กำลังส่งภารกิจ...',
      icon: 'loading',
      showConfirmButton: false,
    });

    try {
      let urls: string[] = [];
      if (evidenceUrls.length > 0) {
        const uploadedUrls: string[] = [];

        for (const url of evidenceUrls) {
          if (url.startsWith('http') && url.includes('supabase')) {
            uploadedUrls.push(url);
            continue;
          }

          const response = await fetch(url);
          const blob = await response.blob();
          const file = new File([blob], `evidence_${Date.now()}.jpg`, { type: 'image/jpeg' });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', childId);

          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.url) {
            uploadedUrls.push(uploadData.url);
          }
        }

        urls = uploadedUrls;
      }

      const { error } = await supabase.from('submissions').insert({
        child_id: childId,
        mission_id: missionId,
        submission_date: today,
        status: 'pending',
        evidence_urls: urls,
        note: note || null,
      });

      if (error) throw error;

      hideAlert();
      showAlert({
        title: 'ส่งภารกิจสำเร็จ!',
        text: 'รอพ่อแม่ตรวจสอบนะ',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });

      setShowSubmit(null);
      setNote('');
      setEvidenceUrls([]);
      await onRefresh();
    } catch (err: any) {
      hideAlert();
      showAlert({
        title: 'ส่งไม่สำเร็จ',
        text: err.message,
        icon: 'error',
      });
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEvidenceUrls((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-3">📋 ภารกิจประจำวัน</h3>
      {missions.map(mission => {
        const submission = submissions.find(
          s => s.mission_id === mission.id && s.submission_date === today
        );

        return (
          <div key={mission.id} className="card mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{mission.icon || '📋'}</span>
                <div>
                  <p className="font-bold">{mission.title}</p>
                  <p className="muted text-sm">
                    +{mission.coin_reward} 🪙 | +{mission.xp_reward} XP
                  </p>
                  {siblings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {siblings.map(sib => {
                        const sibSub = siblingSubmissions.find(
                          s => s.mission_id === mission.id && s.child_id === sib.id
                        );
                        return (
                          <span key={sib.id} className="text-xs pill" style={{ fontSize: '11px' }}>
                            {sib.avatar} {sib.username.split(' ')[0]} {submissionStatusEmoji(sibSub?.status)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {submission ? (
                <span className={`pill ${submission.status === 'approved' ? 'st-approved' : submission.status === 'rejected' ? 'st-rejected' : 'st-pending'}`}>
                  {submission.status === 'approved' ? '✅ สำเร็จ' : submission.status === 'rejected' ? '❌ ไม่ผ่าน' : '⏳ รอตรวจ'}
                </span>
              ) : (
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => setShowSubmit(mission.id)}
                >
                  ทำแล้ว!
                </button>
              )}
            </div>

            {/* Submit Modal */}
            {showSubmit === mission.id && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--cream)' }}>
                <p className="font-bold mb-2">แนบหลักฐาน (ไม่บังคับ)</p>
                
                {/* Evidence Upload */}
                <div className="upload-area mb-3" onClick={() => document.getElementById('evidence-upload')?.click()}>
                  <input
                    id="evidence-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="text-3xl mb-2">📸</div>
                  <p className="font-bold">ถ่ายรูป / เลือกภาพ</p>
                  <p className="muted text-sm">แนบหลักฐานการทำภารกิจ</p>
                </div>

                {evidenceUrls.length > 0 && (
                  <div className="evidence-grid mb-3">
                    {evidenceUrls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Evidence ${idx + 1}`} className="evidence-thumb" />
                    ))}
                  </div>
                )}

                <div className="field mb-2">
                  <textarea
                    className="w-full p-3 rounded-xl border-2"
                    style={{ borderColor: 'var(--line)' }}
                    placeholder="หมายเหตุเพิ่มเติม (ไม่จำเป็น)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn btn-primary btn-sm flex-1"
                    onClick={() => handleSubmit(mission.id)}
                    disabled={uploading}
                  >
                    {uploading ? 'กำลังส่ง...' : 'ส่ง'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowSubmit(null)}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ShopTab({
  childId,
  userCoins,
  onCoinsChange,
  onGoToQuests,
}: {
  childId: string;
  userCoins: number;
  onCoinsChange: (coins: number) => void;
  onGoToQuests: () => void;
}) {
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [showRedeem, setShowRedeem] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<WishlistRequest[]>([]);
  const [showWishForm, setShowWishForm] = useState(false);
  const [wishName, setWishName] = useState('');
  const [wishIcon, setWishIcon] = useState('🎁');
  const [wishPrice, setWishPrice] = useState('');
  const [wishSubmitting, setWishSubmitting] = useState(false);

  useEffect(() => {
    fetchShopItems();
    fetchWishlist();
  }, []);

  async function fetchShopItems() {
    const { data } = await supabase
      .from('shop_items')
      .select('*')
      .eq('active', true);
    if (data) setShopItems(data);
  }

  async function fetchWishlist() {
    const res = await fetch(`/api/wishlist?child_id=${childId}`);
    const data = await res.json();
    if (data.requests) setWishlist(data.requests);
  }

  async function handleWishSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wishName.trim()) return;
    setWishSubmitting(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          item_name: wishName.trim(),
          icon: wishIcon,
          suggested_price: wishPrice ? parseInt(wishPrice) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWishName('');
      setWishPrice('');
      setShowWishForm(false);
      fetchWishlist();
    } catch (err: unknown) {
      showAlert({
        title: 'ส่งคำขอไม่สำเร็จ',
        text: err instanceof Error ? err.message : 'กรุณาลองใหม่',
        icon: 'error',
      });
    } finally {
      setWishSubmitting(false);
    }
  }

  const wishStatusLabel: Record<string, string> = {
    pending: '⏳ รอพ่อแม่อนุมัติ',
    approved: '✅ อนุมัติแล้ว — ดูในร้าน',
    rejected: '❌ ไม่อนุมัติ',
  };

  async function handleRedeem(itemId: string, itemName: string, price: number) {
    if (!childId) return;

    if (userCoins < price) {
      const shortage = price - userCoins;
      showAlert({
        title: 'เหรียญไม่พอ!',
        text: `"${itemName}" ราคา ${price} 🪙 แต่คุณมี ${userCoins} 🪙\nขาดอีก ${shortage} 🪙\n\nอยากทำภารกิจเพิ่มไหม?`,
        icon: 'warning',
        confirmButtonText: 'ไปทำภารกิจ',
        cancelButtonText: 'ปิด',
        onConfirm: onGoToQuests,
      });
      return;
    }

    showAlert({ title: 'กำลังแลก...', icon: 'loading', showConfirmButton: false });

    try {
      const res = await fetchWithAuth('/api/redemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = await res.json();

      if (!res.ok) {
        hideAlert();
        if (data.shortage != null) {
          showAlert({
            title: 'เหรียญไม่พอ!',
            text: `"${itemName}" ราคา ${data.price} 🪙 แต่คุณมี ${data.coins} 🪙\nขาดอีก ${data.shortage} 🪙\n\nอยากทำภารกิจเพิ่มไหม?`,
            icon: 'warning',
            confirmButtonText: 'ไปทำภารกิจ',
            cancelButtonText: 'ปิด',
            onConfirm: onGoToQuests,
          });
        } else {
          showAlert({ title: 'แลกไม่สำเร็จ', text: data.error || 'กรุณาลองใหม่', icon: 'error' });
        }
        return;
      }

      if (typeof data.new_coins === 'number') {
        onCoinsChange(data.new_coins);
      }

      hideAlert();
      showAlert({
        title: 'ส่งคำขอแลกแล้ว!',
        text: 'รอพ่อแม่จัดให้นะ',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
      setShowRedeem(null);
    } catch (err: unknown) {
      hideAlert();
      showAlert({
        title: 'แลกไม่สำเร็จ',
        text: err instanceof Error ? err.message : 'กรุณาลองใหม่',
        icon: 'error',
      });
    }
  }

  function handleRedeemClick(item: { id: string; name: string; price: number }) {
    if (userCoins < item.price) {
      const shortage = item.price - userCoins;
      showAlert({
        title: 'เหรียญไม่พอ!',
        text: `"${item.name}" ราคา ${item.price} 🪙 แต่คุณมี ${userCoins} 🪙\nขาดอีก ${shortage} 🪙\n\nอยากทำภารกิจเพิ่มไหม?`,
        icon: 'warning',
        confirmButtonText: 'ไปทำภารกิจ',
        cancelButtonText: 'ปิด',
        onConfirm: onGoToQuests,
      });
      return;
    }
    setShowRedeem(item.id);
  }

  return (
    <div>
      {/* Wishlist request */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">🌟 ขอของรางวัล</h3>
          <button className="btn btn-sm btn-primary" onClick={() => setShowWishForm(!showWishForm)}>
            {showWishForm ? 'ปิด' : '+ ขอใหม่'}
          </button>
        </div>
        <p className="muted text-sm mb-3">อยากได้อะไร? บอกพ่อแม่แล้วรออนุมัติ!</p>

        {showWishForm && (
          <form onSubmit={handleWishSubmit} className="p-3 rounded-xl mb-3" style={{ background: 'var(--cream)' }}>
            <div className="field">
              <label className="field-label">ชื่อของที่อยากได้</label>
              <input
                type="text"
                value={wishName}
                onChange={(e) => setWishName(e.target.value)}
                placeholder="เช่น ของเล่น, ไอศกรีม"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label className="field-label">ไอคอน</label>
                <input
                  type="text"
                  value={wishIcon}
                  onChange={(e) => setWishIcon(e.target.value)}
                  maxLength={2}
                />
              </div>
              <div className="field">
                <label className="field-label">ราคาเสนอ (ไม่บังคับ)</label>
                <input
                  type="number"
                  value={wishPrice}
                  onChange={(e) => setWishPrice(e.target.value)}
                  placeholder="100"
                  min={1}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm btn-block" disabled={wishSubmitting}>
              {wishSubmitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}
            </button>
          </form>
        )}

        {wishlist.length > 0 && (
          <div className="space-y-2">
            {wishlist.slice(0, 5).map(w => (
              <div key={w.id} className="flex items-center gap-2 text-sm">
                <span>{w.icon || '🎁'}</span>
                <span className="flex-1 font-bold">{w.item_name}</span>
                <span className="muted">{wishStatusLabel[w.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="text-lg font-bold mb-3">🛒 ร้านของรางวัล</h3>
      {shopItems.map(item => {
        const canAfford = userCoins >= item.price;
        return (
        <div key={item.id} className="card mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{item.icon || '🎁'}</span>
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="muted text-sm">{item.price} 🪙</p>
                {!canAfford && (
                  <p className="text-sm" style={{ color: 'var(--danger, #c0392b)' }}>
                    ขาดอีก {item.price - userCoins} 🪙
                  </p>
                )}
              </div>
            </div>
            <button
              className={`btn btn-sm ${canAfford ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => handleRedeemClick(item)}
            >
              แลก
            </button>
          </div>

          {showRedeem === item.id && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--cream)' }}>
              <p className="mb-2">ต้องการแลก "{item.name}" ({item.price} 🪙) ใช่ไหม?</p>
              <p className="muted text-sm mb-2">เหรียญคงเหลือหลังแลก: {userCoins - item.price} 🪙</p>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm flex-1"
                  onClick={() => handleRedeem(item.id, item.name, item.price)}
                >
                  ยืนยัน
                </button>
                <button
                  className="btn btn-ghost btn-sm flex-1"
                  onClick={() => setShowRedeem(null)}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ childId }: { childId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [missionMap, setMissionMap] = useState<Record<string, Mission>>({});

  useEffect(() => {
    fetchHistory();
    fetchRedemptions();
    fetchSubmissions();
  }, [childId]);

  async function fetchHistory() {
    const { data } = await supabase
      .from('coin_history')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setHistory(data);
  }

  async function fetchRedemptions() {
    const { data } = await supabase
      .from('redemptions')
      .select('*, shop_items(name, icon)')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });
    if (data) setRedemptions(data);
  }

  async function fetchSubmissions() {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!data) return;
    setSubmissions(data);

    const missionIds = [...new Set(data.map((s) => s.mission_id))];
    if (missionIds.length === 0) return;

    const { data: missions } = await supabase
      .from('missions')
      .select('*')
      .in('id', missionIds);
    if (missions) {
      const map: Record<string, Mission> = {};
      missions.forEach((m) => { map[m.id] = m; });
      setMissionMap(map);
    }
  }

  const statusLabel: Record<string, string> = {
    pending: '⏳ รอตรวจ',
    approved: '✅ ผ่าน',
    rejected: '❌ ไม่ผ่าน',
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-3">📋 ประวัติภารกิจ</h3>
      {submissions.length === 0 ? (
        <p className="muted text-center py-4 mb-6">ยังไม่มีการส่งภารกิจ</p>
      ) : (
        <div className="card mb-6">
          {submissions.map((sub) => (
            <div key={sub.id} className="flex justify-between items-start py-2">
              <div>
                <p className="font-bold">
                  {missionMap[sub.mission_id]?.icon || '📋'}{' '}
                  {missionMap[sub.mission_id]?.title || 'ภารกิจ'}
                </p>
                <p className="muted text-sm">
                  {new Date(sub.submission_date).toLocaleDateString('th-TH')}
                </p>
              </div>
              <span className="pill text-sm">{statusLabel[sub.status] || sub.status}</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-lg font-bold mb-3">📜 ประวัติเหรียญ</h3>
      {history.length === 0 ? (
        <p className="muted text-center py-8">ยังไม่มีประวัติ</p>
      ) : (
        <div className="card">
          {history.map(h => (
            <div key={h.id} className="flex justify-between items-center py-2 divider-none">
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

      <h3 className="text-lg font-bold mb-3 mt-6">🎁 การแลกของรางวัล</h3>
      {redemptions.length === 0 ? (
        <p className="muted text-center py-8">ยังไม่มีการแลกของ</p>
      ) : (
        <div className="card">
          {redemptions.map(r => (
            <div key={r.id} className="flex justify-between items-center py-2">
              <div>
                <p className="font-bold">{r.shop_items?.name || 'Unknown'}</p>
                <p className="muted text-sm">{new Date(r.created_at).toLocaleDateString('th-TH')}</p>
              </div>
              <span className={`pill ${r.status === 'fulfilled' ? 'st-approved' : 'st-pending'}`}>
                {r.status === 'fulfilled' ? '✅ ได้รับแล้ว' : '⏳ รอจัดให้'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
