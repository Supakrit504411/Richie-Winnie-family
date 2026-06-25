-- ============================================================
-- Family Quest v2 — Families + Siblings + Wishlist RLS
-- Run in Supabase Dashboard → SQL Editor (after supabase-schema.sql)
-- ============================================================

-- 1. ตารางครอบครัว
CREATE TABLE IF NOT EXISTS public.families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL DEFAULT 'ครอบครัว',
  invite_code TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_families_invite_code ON public.families(invite_code);

-- 2. เพิ่ม family_id ใน users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id);

CREATE INDEX IF NOT EXISTS idx_users_family_id ON public.users(family_id);

-- 3. Backfill: สร้างครอบครัวให้ parent ที่มีอยู่แล้ว
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

-- 4. ลูกที่ยังไม่มี family_id → สืบจาก parent
UPDATE public.users c
SET family_id = p.family_id
FROM public.users p
WHERE c.role = 'child'
  AND c.parent_id = p.id
  AND c.family_id IS NULL
  AND p.family_id IS NOT NULL;

-- ============================================================
-- RLS: families
-- ============================================================
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can read own family" ON public.families;
CREATE POLICY "Family members can read own family"
  ON public.families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.family_id = families.id
    )
  );

-- ============================================================
-- RLS: users — อ่านสมาชิกในครอบครัวเดียวกัน
-- ============================================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read family members" ON public.users;

CREATE POLICY "Users can read family members"
  ON public.users FOR SELECT
  USING (
    auth.uid() = id
    OR (
      family_id IS NOT NULL
      AND family_id IN (
        SELECT u.family_id FROM public.users u
        WHERE u.id = auth.uid() AND u.family_id IS NOT NULL
      )
    )
  );

-- ============================================================
-- RLS: submissions — พี่น้องเห็นสถานะกันได้
-- ============================================================
DROP POLICY IF EXISTS "Users can read relevant submissions" ON public.submissions;

CREATE POLICY "Users can read relevant submissions"
  ON public.submissions FOR SELECT
  USING (
    auth.uid() = child_id
    OR auth.uid() = reviewed_by
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.parent_id = u.id
      WHERE u.id = auth.uid() AND c.id = child_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users me
      JOIN public.users sibling ON sibling.family_id = me.family_id
      WHERE me.id = auth.uid()
        AND me.family_id IS NOT NULL
        AND sibling.id = child_id
        AND sibling.role = 'child'
    )
  );

DROP POLICY IF EXISTS "Parents can update submissions" ON public.submissions;
CREATE POLICY "Parents can update submissions"
  ON public.submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND u.family_id IS NOT NULL
        AND c.id = child_id
        AND c.role = 'child'
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.parent_id = u.id
      WHERE u.id = auth.uid() AND c.id = child_id
    )
  );

-- ============================================================
-- RLS: redemptions — parent ในครอบครัวเดียวกัน fulfill ได้
-- ============================================================
DROP POLICY IF EXISTS "Users can read relevant redemptions" ON public.redemptions;
CREATE POLICY "Users can read relevant redemptions"
  ON public.redemptions FOR SELECT
  USING (
    auth.uid() = child_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.parent_id = u.id
      WHERE u.id = auth.uid() AND c.id = child_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND u.family_id IS NOT NULL
        AND c.id = child_id
    )
  );

DROP POLICY IF EXISTS "Parents can fulfill redemptions" ON public.redemptions;
CREATE POLICY "Parents can fulfill redemptions"
  ON public.redemptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND u.family_id IS NOT NULL
        AND c.id = child_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.parent_id = u.id
      WHERE u.id = auth.uid() AND c.id = child_id
    )
  );

-- ============================================================
-- RLS: coin_history
-- ============================================================
DROP POLICY IF EXISTS "Users can read own coin history" ON public.coin_history;
CREATE POLICY "Users can read own coin history"
  ON public.coin_history FOR SELECT
  USING (
    auth.uid() = child_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.parent_id = u.id
      WHERE u.id = auth.uid() AND c.id = child_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users me
      JOIN public.users sibling ON sibling.family_id = me.family_id
      WHERE me.id = auth.uid()
        AND me.family_id IS NOT NULL
        AND sibling.id = child_id
        AND sibling.role = 'child'
    )
  );

-- ============================================================
-- RLS: wishlist_requests
-- ============================================================
DROP POLICY IF EXISTS "Children can create wishlist" ON public.wishlist_requests;
DROP POLICY IF EXISTS "Users can read family wishlist" ON public.wishlist_requests;
DROP POLICY IF EXISTS "Parents can update wishlist" ON public.wishlist_requests;

CREATE POLICY "Children can create wishlist"
  ON public.wishlist_requests FOR INSERT
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Users can read family wishlist"
  ON public.wishlist_requests FOR SELECT
  USING (
    auth.uid() = child_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND u.family_id IS NOT NULL
        AND c.id = child_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users me
      JOIN public.users sibling ON sibling.family_id = me.family_id
      WHERE me.id = auth.uid()
        AND me.family_id IS NOT NULL
        AND sibling.id = child_id
    )
  );

CREATE POLICY "Parents can update wishlist"
  ON public.wishlist_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.users c ON c.family_id = u.family_id
      WHERE u.id = auth.uid()
        AND u.role = 'parent'
        AND u.family_id IS NOT NULL
        AND c.id = child_id
    )
  );

-- shop_items: parent ในครอบครัวเดียวกันเห็นของที่สร้างโดย parent คนอื่นในครอบครัว
DROP POLICY IF EXISTS "Anyone can read active shop items" ON public.shop_items;
CREATE POLICY "Anyone can read active shop items"
  ON public.shop_items FOR SELECT
  USING (active = TRUE);

DROP POLICY IF EXISTS "Parents can manage shop items" ON public.shop_items;
CREATE POLICY "Parents can manage shop items"
  ON public.shop_items FOR ALL
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.users me
      JOIN public.users creator ON creator.family_id = me.family_id
      WHERE me.id = auth.uid()
        AND me.role = 'parent'
        AND me.family_id IS NOT NULL
        AND creator.id = created_by
    )
  );
