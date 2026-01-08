-- docker/postgres/init.sql

CREATE DATABASE ai_platform;

\c ai_platform;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
