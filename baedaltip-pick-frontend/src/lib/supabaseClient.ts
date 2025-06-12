import { createClient } from '@supabase/supabase-js'

// 환경변수에서 값 읽기 (안전하게)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

console.log('🚀 Supabase 클라이언트 초기화 중...')
console.log('URL:', supabaseUrl)
console.log('Anon Key 길이:', supabaseAnonKey?.length || 0)
console.log('Service Key 길이:', supabaseServiceKey?.length || 0)
console.log('환경변수 값들:')
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'undefined')
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY 길이:', (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').length)
console.log('- SUPABASE_SERVICE_ROLE_KEY 길이:', (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length)

// URL과 키가 유효한지 확인
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 누락되었습니다!')
  console.error('URL:', supabaseUrl)
  console.error('Anon Key:', supabaseAnonKey ? '있음' : '없음')
  console.error('Service Key:', supabaseServiceKey ? '있음' : '없음')
}

// 일반 클라이언트
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service Key로 RLS 우회하는 관리자 클라이언트
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

console.log('✅ Supabase 클라이언트 초기화 완료!')