import { v4 as uuidv4 } from 'uuid';
import { generateSecureString } from '../lib/crypto';

import { D1Database } from '@cloudflare/workers-types';

type TokenType = 'access' | 'verification';

interface IToken {
	id: string;
	userId: string;
	token: string;
	type: TokenType;
	device: string;
	ipAddress: string;
	createdAt: Date;
	expiresAt: Date;
}

interface ICreateToken extends Optional<IToken, 'id' | 'createdAt' | 'expiresAt' | 'token'> {}

class Token implements IToken {
	id: IToken['id'];
	userId: IToken['userId'];
	token: IToken['token'];
	type: IToken['type'];
	device: IToken['device'];
	ipAddress: IToken['ipAddress'];
	createdAt: IToken['createdAt'];
	expiresAt: IToken['expiresAt'];

	private static db: D1Database;
	private static tokenLength = 64;
	private static tokenExpires = 1000 * 60 * 60 * 24 * 30; // 30 days

	constructor(createToken: ICreateToken, id: string = uuidv4(), createdAt: Date = new Date()) {
		this.id = createToken.id ? createToken.id : id;
		this.userId = createToken.userId;
		this.token = createToken.token ? createToken.token : generateSecureString(Token.tokenLength);
		this.type = createToken.type;
		this.device = createToken.device;
		this.ipAddress = createToken.ipAddress;
		this.createdAt = createToken.createdAt || createdAt;
		this.expiresAt = createToken.expiresAt || new Date(Date.now() + Token.tokenExpires);
	}

	// Method to convert a plain object to a Token instance
	static fromObject(obj: any): Token {
		return new Token(
			{
				userId: obj.userId,
				token: obj.token,
				type: obj.type,
				device: obj.device,
				ipAddress: obj.ipAddress,
				expiresAt: new Date(obj.expiresAt),
			},
			obj.id,
			new Date(obj.createdAt),
		);
	}

	// Method to convert a Token instance to a plain object
	toObject(): IToken {
		return {
			id: this.id,
			userId: this.userId,
			token: this.token,
			type: this.type,
			device: this.device,
			ipAddress: this.ipAddress,
			createdAt: this.createdAt,
			expiresAt: this.expiresAt,
		};
	}

	// Initialize the database connection
	static initialize(db: D1Database) {
		this.db = db;
	}

	// Static method to create a new token
	static async create(createToken: ICreateToken): Promise<Token> {
		const token = new Token(createToken);
		await this.db
			.prepare(
				`INSERT INTO tokens (id, userId, token, type, device, ipAddress, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				token.id,
				token.userId,
				token.token,
				token.type,
				token.device,
				token.ipAddress,
				token.createdAt.toISOString(),
				token.expiresAt.toISOString(),
			)
			.run();
		return token;
	}

	// Static method to read (find) a token by ID
	static async findById(id: string): Promise<Token | undefined> {
		const row = await this.db.prepare(`SELECT * FROM tokens WHERE id = ?`).bind(id).first();
		if (row) {
			return this.fromObject(row);
		}
		return undefined;
	}

	// Find by user id
	static async findByUserId(userId: string): Promise<Token[]> {
		const rows = await this.db.prepare(`SELECT * FROM tokens WHERE userId = ?`).bind(userId).all();
		return rows.results.map((row: any) => this.fromObject(row));
	}

	// Static method to find all tokens
	static async findAll(): Promise<Token[]> {
		const rows = await this.db.prepare(`SELECT * FROM tokens`).all();
		return rows.results.map((row: any) => this.fromObject(row));
	}

	// Static method to update a token by ID
	static async update(id: string, updateToken: Partial<ICreateToken>): Promise<Token | undefined> {
		const token = await this.findById(id);
		if (!token) {
			return undefined;
		}

		Object.assign(token, updateToken, { updatedAt: new Date() });
		await this.db
			.prepare(
				`UPDATE tokens SET userId = ?, token = ?, type = ?, device = ?, ipAddress = ?, expiresAt = ? WHERE id = ?`,
			)
			.bind(
				token.userId,
				token.token,
				token.type,
				token.device,
				token.ipAddress,
				token.expiresAt.toISOString(),
				id,
			)
			.run();

		return token;
	}

	// Static method to delete a token by ID
	static async delete(id: string): Promise<boolean> {
		const result = await this.db.prepare(`DELETE FROM tokens WHERE id = ?`).bind(id).run();
		return result ? true : false;
	}

	// Static method to delete all expired tokens
	static async expireTokens(): Promise<void> {
		const now = new Date().toISOString();
		await this.db.prepare(`DELETE FROM tokens WHERE expiresAt < ?`).bind(now).run();
	}
}

export { Token };
export type { IToken, ICreateToken };
