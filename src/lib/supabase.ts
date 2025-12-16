import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export interface Project {
  id: string;
  name: string;
  image_url: string;
  image_width: number;
  image_height: number;
  created_at: string;
  updated_at: string;
}

export interface Measurement {
  id: string;
  project_id: string;
  tool_type: string;
  start_x: number;
  start_y: number;
  end_x: number;
  font_size:number,
  end_y: number;
  pointer_width:number;
  pixel_length: number;
  actual_value: string | null;
  unit: string;
  label: string | null;
  color: string;
  point_style: 'round' | 'arrow' | 'square' | 'diamond';
  text_position: 'top' | 'bottom' | 'left' | 'right';
  line_width: number;
  created_at: string;
  text_offset_x?:number;
  text_offset_y?:number
}
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
