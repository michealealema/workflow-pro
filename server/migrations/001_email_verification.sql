-- Add email verification support to existing users

-- Existing users are automatically marked as verified.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- New users must verify their email.
ALTER TABLE users
ALTER COLUMN is_verified SET DEFAULT FALSE;

-- Store hashed verification tokens.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS verification_token_hash TEXT;

-- Store token expiration time.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;

-- Prevent duplicate verification token hashes.
CREATE UNIQUE INDEX IF NOT EXISTS users_verification_token_hash_unique
ON users (verification_token_hash)
WHERE verification_token_hash IS NOT NULL;