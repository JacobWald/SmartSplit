import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Used in /api/ routes for privileged actions like writing to DB or uploading to Storage
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)