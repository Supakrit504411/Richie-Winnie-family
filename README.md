# Family Quest — Next.js + Supabase

เกมสะสมแต้มสำหรับเด็ก: ทำภารกิจประจำวัน → พ่อ/แม่ตรวจ → ได้เหรียญ+EXP → อัพเกรดตัวละคร/บ้าน/รถ → แลกของรางวัลจริง

## 🚀 Getting Started

### 1. Setup Supabase

1. ไปที่ https://supabase.com → Sign Up
2. New Project → ชื่อ "family-quest" → Region Singapore
3. เก็บ URL + API key (anon + service_role)

### 2. รัน SQL Schema

ไปที่ Supabase Dashboard → SQL Editor → รันไฟล์ `supabase-schema.sql` จากโฟลเดอร์หลัก

### 3. สร้าง Storage Bucket

ไปที่ Storage → New Bucket → ชื่อ "submission-evidence" → Private → 10MB limit

### 4. Environment Variables

คัดลอก `.env.local.example` เป็น `.env.local` แล้วแทนที่ค่า:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 5. ติดตั้ง Dependencies และรัน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## 📁 โครงสร้างโปรเจค

```
family-quest-app/
├── app/
│   ├── page.tsx                    # Login/Splash
│   ├── dashboard/
│   │   ├── child/                  # Child Dashboard
│   │   │   └── page.tsx
│   │   └── parent/                 # Parent Dashboard
│   │       └── page.tsx
│   └── api/                        # API Routes
│       ├── auth/
│       ├── missions/
│       ├── submissions/
│       ├── upload/
│       ├── shop-items/
│       ├── redemptions/
│       └── wishlist/
├── components/
│   ├── EvidenceUploader.tsx        # Upload รูป evidence
│   ├── SubmissionCard.tsx          # แสดง submission + รูป
│   ├── MissionCard.tsx
│   ├── ShopCard.tsx
│   ├── BottomNav.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   └── Confetti.tsx
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── supabase-server.ts          # Server client
│   ├── types.ts                    # TypeScript types
│   ├── utils.ts                    # Helper functions
│   ├── hooks.ts                    # Real-time hooks
│   └── migrate.ts                  # JSON migration
└── .env.local
```

## 🎯 ฟีเจอร์หลัก

- **Photo Evidence**: เด็กสามารถถ่าย/แนบรูปหลักฐานส่งให้พ่อแม่ตรวจ
- **Real-time Sync**: อัพเดททันทีกเมื่อมีข้อมูลใหม่
- **RLS Security**: ข้อมูลปลอดภัยด้วย Row Level Security
- **Responsive**: ใช้งานได้ดีบนมือถือ

## 📝 การใช้งาน

### Child Flow
1. Login ด้วย username + PIN
2. ดูภารกิจประจำวัน
3. กด "ทำแล้ว!" → แนบรูปหลักฐาน → ส่ง
4. ดูของรางวัลในร้าน → แลก
5. ดูประวัติเหรียญ

### Parent Flow
1. Login ด้วย username + password
2. ดูภาพรวม + จำนวนเด็ก
3. ตรวจภารกิจ → ดูรูป evidence → Approve/Reject
4. จัดของรางวัลที่เด็กแลก
5. จัดการภารกิจและของรางวัล

## 🔄 Migration จาก JSON

ถ้ามีไฟล์ backup JSON จากแอปเดิม:

1. เปิดไฟล์ JSON
2. เรียกใช้ `migrateFromJSON()` จาก `lib/migrate.ts`
3. ข้อมูลจะถูกย้ายไป Supabase ทั้งหมด

## 🚢 Deploy ขึ้น Vercel

1. Push ขึ้น GitHub
2. Import repo → Vercel
3. Set environment variables
4. Deploy อัตโนมัติ

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **State Management**: React Hooks + Context
- **Real-time**: Supabase Realtime

## 📄 License

Internal use only — Family Quest Project
