import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  name: string;
  conditions: string[];
  medications: string[];
  created_at: string;
};

export type EmergencyContact = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
};

export type AlertLog = {
  id: string;
  user_id: string;
  scene_description: string;
  summary: string;
  gps_lat: number;
  gps_lng: number;
  timestamp: string;
  contacts_notified: string[];
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', userId);
  if (error) return [];
  return data ?? [];
}

export async function saveContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact | null> {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .insert(contact)
    .select()
    .single();
  if (error) return null;
  return data;
}

export async function deleteContact(id: string): Promise<boolean> {
  const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
  return !error;
}

export async function logAlert(log: Omit<AlertLog, 'id'>): Promise<AlertLog | null> {
  const { data, error } = await supabase
    .from('alert_logs')
    .insert(log)
    .select()
    .single();
  if (error) return null;
  return data;
}

export async function getAlertLogs(userId: string): Promise<AlertLog[]> {
  const { data, error } = await supabase
    .from('alert_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });
  if (error) return [];
  return data ?? [];
}
