-- database/migrations/000_enable_extensions.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- optional, for uuid_generate_v4()
