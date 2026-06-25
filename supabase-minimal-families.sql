-- รันไฟล์นี้ถ้าสมัครแล้วขึ้น "สร้างครอบครัวไม่สำเร็จ"
-- Supabase Dashboard → SQL Editor → New query → Paste → Run

CREATE TABLE IF NOT EXISTS public.families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL DEFAULT 'ครอบครัว',
  invite_code TEXT UNIQUE NOT NULL
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id);

CREATE INDEX IF NOT EXISTS idx_families_invite_code ON public.families(invite_code);
CREATE INDEX IF NOT EXISTS idx_users_family_id ON public.users(family_id);

-- สร้างครอบครัวให้ parent เก่าที่ยังไม่มี family_id
DO $$
DECLARE
  p RECORD;
  new_family_id UUID;
  invite TEXT;
BEGIN
  FOR p IN
    SELECT id, username FROM public.users
    WHERE role = 'parent' AND family_id IS NULL
  LOOP
    invite := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    INSERT INTO public.families (name, invite_code)
    VALUES (p.username || ' ครอบครัว', invite)
    RETURNING id INTO new_family_id;
    UPDATE public.users SET family_id = new_family_id WHERE id = p.id;
    UPDATE public.users SET family_id = new_family_id WHERE parent_id = p.id;
  END LOOP;
END $$;
