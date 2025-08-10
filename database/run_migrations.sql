-- Main migration runner - execute this in Railway PostgreSQL
-- Run these in order:

\i 001_initial_schema.sql
\i 002_indexes_and_performance.sql  
\i 003_triggers_and_functions.sql
\i 004_rls_policies.sql

-- Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify extensions are installed
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm', 'pgcrypto');

-- Test vector extension
SELECT vector_dims('[1,2,3]'::vector);