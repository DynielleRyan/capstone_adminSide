import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'


// ==============================
//  Supabase Initialization
// ==============================
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in backend .env')
}

// For server-side operations that need service role key
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// ==============================
//  Twilio Initialization
// ==============================
const twilioSID = process.env.TWILIO_ACCOUNT_SID!;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioMessagingServiceSID = process.env.TWILIO_MESSAGING_SERVICE_SID!;
const adminPhone = process.env.ADMIN_PHONE!;

if (!twilioSID || !twilioAuthToken) {
  console.warn('⚠️ Twilio credentials not found — SMS notifications disabled');
}

export const twilioClient = twilio(twilioSID, twilioAuthToken);
export const MSG_SERVICE_SID = twilioMessagingServiceSID;
export const ADMIN_PHONE = adminPhone;