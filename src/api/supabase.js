import config from '../config/config.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

export async function fetchActivePositions() {
    const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('status', 'active');
    
    if (error) throw error;
    return data;
}

export async function fetchTradesForPosition(positionId) {
    const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('position_id', positionId)
        .eq('is_deleted', false)
        .order('trade_date', { ascending: false });
    
    if (error) throw error;
    return data;
}

export default supabase;
