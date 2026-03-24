-- Create friends user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'friends') THEN
      CREATE ROLE friends WITH LOGIN PASSWORD 'friends';
   END IF;
END
$do$;

-- Create friends_db if not exists
SELECT 'CREATE DATABASE friends_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'friends_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE friends_db TO friends;
