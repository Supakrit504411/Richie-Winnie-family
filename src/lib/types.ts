export interface User {
  id: string;
  created_at: string;
  username: string;
  role: 'child' | 'parent';
  avatar?: string;
  avatar_url?: string | null;
  parent_id?: string;
  family_id?: string;
  is_active?: boolean;
  coins: number;
  xp: number;
  house_level: number;
  car_level: number;
  streak: number;
  last_streak_date?: string;
}

export interface Family {
  id: string;
  created_at: string;
  name: string;
  invite_code: string;
  is_active?: boolean;
}

export interface Mission {
  id: string;
  created_at: string;
  created_by: string;
  title: string;
  icon?: string;
  type: 'daily' | 'special';
  deadline?: string;
  start_date?: string | null;
  end_date?: string | null;
  recurring_days?: string[] | null;
  coin_reward: number;
  xp_reward: number;
  active: boolean;
  attachments?: string[] | null;
  target_child_id?: string | null;
}

export interface Submission {
  id: string;
  created_at: string;
  child_id: string;
  mission_id: string;
  submission_date: string;
  status: 'pending' | 'approved' | 'rejected';
  evidence_urls?: string[];
  note?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface ShopItem {
  id: string;
  created_at: string;
  created_by: string;
  name: string;
  icon?: string;
  price: number;
  active: boolean;
  min_level?: number;
}

export interface Redemption {
  id: string;
  created_at: string;
  child_id: string;
  item_id: string;
  status: 'pending' | 'fulfilled';
  fulfilled_at?: string;
  fulfilled_by?: string;
  shop_items?: Pick<ShopItem, 'name' | 'icon' | 'price'> | null;
}

export interface CoinHistory {
  id: string;
  created_at: string;
  child_id: string;
  delta: number;
  reason: string;
  kind: 'mission' | 'upgrade' | 'redeem' | 'penalty' | 'bonus';
}

export interface BonusReward {
  id: string;
  created_at: string;
  child_id: string;
  given_by: string;
  amount: number;
  reason?: string;
  given_at: string;
}

export interface WishlistRequest {
  id: string;
  created_at: string;
  child_id: string;
  requested_by: string;
  item_name: string;
  icon?: string;
  suggested_price?: number;
  approved_price?: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
  approved_by?: string;
}

export interface AppState {
  parentPin: string;
  children: Array<{
    id: string;
    name: string;
    avatar: string;
    pin: string;
    coins: number;
    xp: number;
    houseLevel: number;
    carLevel: number;
    streak: number;
    lastStreakDate: string | null;
  }>;
  missions: Array<{
    id: string;
    title: string;
    icon: string;
    type: 'daily' | 'special';
    deadline?: string;
    coin: number;
    xp: number;
    active: boolean;
  }>;
  shop: Array<{
    id: string;
    name: string;
    icon: string;
    cost: number;
  }>;
  submissions: Array<{
    id: string;
    childId: string;
    missionId: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
    ts: number;
    note?: string;
  }>;
  redemptions: Array<{
    id: string;
    childId: string;
    itemId: string;
    status: 'pending' | 'fulfilled';
    ts: number;
  }>;
  history: Array<{
    id: string;
    childId: string;
    delta: number;
    reason: string;
    ts: number;
    kind: string;
  }>;
}
