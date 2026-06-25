import { getSupabaseServer } from './supabase-server';
import bcrypt from 'bcryptjs';
import { AppState } from './types';

/**
 * Migrate data from JSON backup to Supabase
 * 
 * Usage:
 * 1. Load the JSON backup file from the old app
 * 2. Call migrateFromJSON(backupData)
 * 3. It will create parent account and all child data
 */

export async function migrateFromJSON(backupData: AppState) {
  console.log('Starting migration...');

  // Step 1: Create parent account
  const parentPassword = backupData.parentPin || '1234';
  const parentUsername = 'Parent';
  
  const { data: parentUser, error: parentError } = await getSupabaseServer().auth.admin.createUser({
    email: 'parent@family-quest.local',
    password: parentPassword,
    user_metadata: { username: parentUsername },
  });

  if (parentError) {
    console.error('Error creating parent:', parentError);
    throw parentError;
  }

  console.log('Parent created:', parentUser.user.id);

  // Insert parent into users table
  const { error: parentProfileError } = await getSupabaseServer().from('users').insert({
    id: parentUser.user.id,
    username: parentUsername,
    role: 'parent',
    password_hash: '', // Auth handles password
    coins: 0,
    xp: 0,
    house_level: 1,
    car_level: 1,
    streak: 0,
  });

  if (parentProfileError) {
    console.error('Error inserting parent profile:', parentProfileError);
    throw parentProfileError;
  }

  // Step 2: Create children
  for (const childData of backupData.children) {
    const childUsername = childData.name;
    const childPassword = childData.pin || '0000';

    const { data: childUser, error: childError } = await getSupabaseServer().auth.admin.createUser({
      email: `${childData.id}@family-quest.local`,
      password: childPassword,
      user_metadata: { username: childUsername },
    });

    if (childError) {
      console.error(`Error creating child ${childUsername}:`, childError);
      continue;
    }

    // Insert child into users table
    const { error: childProfileError } = await getSupabaseServer().from('users').insert({
      id: childUser.user.id,
      username: childUsername,
      role: 'child',
      avatar: childData.avatar,
      parent_id: parentUser.user.id,
      password_hash: '',
      coins: childData.coins,
      xp: childData.xp,
      house_level: childData.houseLevel,
      car_level: childData.carLevel,
      streak: childData.streak,
      last_streak_date: childData.lastStreakDate,
    });

    if (childProfileError) {
      console.error(`Error inserting child profile ${childUsername}:`, childProfileError);
      continue;
    }

    console.log(`Child created: ${childUsername}`);
  }

  // Step 3: Create missions
  for (const missionData of backupData.missions) {
    const { error: missionError } = await getSupabaseServer().from('missions').insert({
      title: missionData.title,
      icon: missionData.icon,
      type: missionData.type,
      deadline: missionData.deadline,
      coin_reward: missionData.coin,
      xp_reward: missionData.xp,
      active: missionData.active,
      created_by: parentUser.user.id,
    });

    if (missionError) {
      console.error(`Error creating mission ${missionData.title}:`, missionError);
    }
  }

  // Step 4: Create shop items
  for (const shopData of backupData.shop) {
    const { error: shopError } = await getSupabaseServer().from('shop_items').insert({
      name: shopData.name,
      icon: shopData.icon,
      price: shopData.cost,
      active: true,
      created_by: parentUser.user.id,
    });

    if (shopError) {
      console.error(`Error creating shop item ${shopData.name}:`, shopError);
    }
  }

  // Step 5: Create submissions
  for (const subData of backupData.submissions) {
    const child = backupData.children.find(c => c.id === subData.childId);
    if (!child) continue;

    const { data: childUser } = await getSupabaseServer()
      .from('users')
      .select('id')
      .eq('username', child.name)
      .single();

    if (!childUser) continue;

    const { error: subError } = await getSupabaseServer().from('submissions').insert({
      child_id: childUser.id,
      mission_id: subData.missionId,
      submission_date: subData.date,
      status: subData.status,
      note: subData.note,
      reviewed_at: subData.ts ? new Date(subData.ts).toISOString() : null,
    });

    if (subError) {
      console.error(`Error creating submission:`, subError);
    }
  }

  // Step 6: Create redemptions
  for (const redemptionData of backupData.redemptions) {
    const child = backupData.children.find(c => c.id === redemptionData.childId);
    if (!child) continue;

    const { data: childUser } = await getSupabaseServer()
      .from('users')
      .select('id')
      .eq('username', child.name)
      .single();

    if (!childUser) continue;

    const { error: redemptionError } = await getSupabaseServer().from('redemptions').insert({
      child_id: childUser.id,
      item_id: redemptionData.itemId,
      status: redemptionData.status,
      fulfilled_at: redemptionData.ts ? new Date(redemptionData.ts).toISOString() : null,
    });

    if (redemptionError) {
      console.error(`Error creating redemption:`, redemptionError);
    }
  }

  // Step 7: Create coin history
  for (const historyData of backupData.history) {
    const child = backupData.children.find(c => c.id === historyData.childId);
    if (!child) continue;

    const { data: childUser } = await getSupabaseServer()
      .from('users')
      .select('id')
      .eq('username', child.name)
      .single();

    if (!childUser) continue;

    const { error: historyError } = await getSupabaseServer().from('coin_history').insert({
      child_id: childUser.id,
      delta: historyData.delta,
      reason: historyData.reason,
      kind: historyData.kind as any,
    });

    if (historyError) {
      console.error(`Error creating coin history:`, historyError);
    }
  }

  console.log('Migration completed!');
  return { success: true };
}
