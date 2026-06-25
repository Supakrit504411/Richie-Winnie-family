'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Submission, CoinHistory } from '@/lib/types';

/**
 * Hook to fetch and listen to submissions in real-time
 */
export function useSubmissions(parentId?: string) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    try {
      let query = supabase
        .from('submissions')
        .select('*, missions(title, icon), users(username, avatar)')
        .order('created_at', { ascending: false });

      if (parentId) {
        // Get all children of this parent
        const { data: children } = await supabase
          .from('users')
          .select('id')
          .eq('parent_id', parentId);

        if (children && children.length > 0) {
          const childIds = children.map(c => c.id);
          query = query.in('child_id', childIds);
        }
      }

      const { data } = await query;
      if (data) setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    fetchSubmissions();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('submissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
        },
        async (payload) => {
          console.log('Submission changed:', payload);
          await fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSubmissions]);

  return { submissions, loading, refetch: fetchSubmissions };
}

/**
 * Hook to fetch and listen to coin history in real-time
 */
export function useCoinHistory(childId: string | undefined) {
  const [history, setHistory] = useState<CoinHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;

    const fetchHistory = async () => {
      const { data } = await supabase
        .from('coin_history')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setHistory(data);
      setLoading(false);
    };

    fetchHistory();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('coin-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coin_history',
          filter: `child_id=eq.${childId}`,
        },
        (payload) => {
          const newRecord = payload.new as CoinHistory;
          setHistory(prev => [newRecord, ...prev]);
          
          // Show notification
          if (newRecord.delta > 0) {
            toast(`ได้ ${newRecord.delta} เหรียญ!`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId]);

  return { history, loading };
}

// Simple toast function (in production, use a proper toast library)
function toast(message: string) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
