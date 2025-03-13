import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nbobiopkrshwajcsirjt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ib2Jpb3BrcnNod2FqY3Npcmp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTY1Njc5MywiZXhwIjoyMDU3MjMyNzkzfQ.twI8754GItnq_Fu3hwR8F9nGhWf53MTL9Ue1EtwWYz4"

export const supabase = createClient(supabaseUrl, supabaseKey);
