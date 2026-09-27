import { createClient } from "@supabase/supabase-js";

let supabaseInstance = null;

export const getSupabaseClient = (url, key) => {
  if (!url || !key) return null;
  
  // 既存のインスタンスがあり、URL/Keyに変更がなければ再利用
  if (!supabaseInstance || supabaseInstance.supabaseUrl !== url) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false
        }
      });
      supabaseInstance.supabaseUrl = url;
    } catch (e) {
      console.error("Supabase初期化エラー:", e);
      return null;
    }
  }
  return supabaseInstance;
};
