import { createClient } from "@supabase/supabase-js";

// Thay thông tin lấy từ Supabase Settings -> API vào 2 biến dưới đây:
const SUPABASE_URL = "https://kobfvguoonddrpidbrqs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYmZ2Z3Vvb25kZHJwaWRicnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1Nzc2OTIsImV4cCI6MjEwNjE1MzY5Mn0.QEJwb68Xt450zuJOlQuqrSr3ZfDOv8JsB1L-eJqwksw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
