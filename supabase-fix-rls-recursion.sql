-- ============================================================
-- FIX: infinite recursion detected in policy for relation "users"
-- รันไฟล์นี้ใน Supabase → SQL Editor (ครั้งเดียว)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.users WHERE id = auth.uid();
$$;

-- ลบ policy เก่าที่ทำให้วนลูป
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read family members" ON public.users;

CREATE POLICY "Users can read family members"
  ON public.users FOR SELECT
  USING (
    auth.uid() = id
    OR (
      family_id IS NOT NULL
      AND family_id = public.get_my_family_id()
    )
  );

DROP POLICY IF EXISTS "Family members can read own family" ON public.families;

CREATE POLICY "Family members can read own family"
  ON public.families FOR SELECT
  USING (id = public.get_my_family_id());
