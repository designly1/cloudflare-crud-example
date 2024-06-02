DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE
	users (
		id UUID PRIMARY KEY,
		firstName TEXT,
		lastName TEXT,
		email TEXT UNIQUE,
		phone TEXT UNIQUE,
		password TEXT,
		role TEXT,
		status TEXT,
		openIdSub TEXT NULL DEFAULT NULL,
		createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

-- Seed users table
INSERT INTO
	users (
		id,
		firstName,
		lastName,
		email,
		phone,
		password,
		role,
		status,
		createdAt,
		updatedAt
	)
VALUES
	(
		'f34bd970-052a-4e26-bbc8-626a586023c5',
		'John',
		'Doe',
		'john.doe@example.com',
		'1234567890',
		-- password: Password123! - bcrypt hash salt: 10 rounds
		'$2a$10$4ix9iLrjxItWjuvS1JLT3uIB6sD6YSN5mY6..6uCZPE7fsbxsxYc.',
		'admin',
		'active',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP
	);

-- Create tokens table
DROP TABLE IF EXISTS tokens;

CREATE TABLE
	tokens (
		id UUID PRIMARY KEY,
		userId UUID,
		token TEXT,
		type TEXT,
		device TEXT,
		ipAddress TEXT,
		createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		expiresAt TIMESTAMP
	);
