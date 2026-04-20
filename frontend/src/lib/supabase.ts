import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Resource {
  id: string;
  name: string;
  type: 'salle' | 'materiel' | 'decoration' | 'traiteur';
  description: string;
  price: number;
  capacity: number;
  image_url?: string;
  provider_name: string;
  provider_email: string;
  provider_phone?: string;
  location?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  resource_id: string;
  organizer_name: string;
  organizer_email: string;
  organizer_phone?: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at: string;
}
