import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test connection by querying the messages table
    const { data, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      connection: 'Connected to Supabase',
      tableExists: true,
      messageCount: count,
      sampleData: data,
    });
  } catch (error) {
    console.error('Supabase connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      connection: 'Failed to connect to Supabase',
    });
  }
}
