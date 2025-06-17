import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
process.env.VITE_ANTHROPIC_API_KEY = 'test-anthropic-key'