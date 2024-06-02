import { v4 as uuidv4 } from 'uuid';
import { compareSync, hashSync } from 'bcryptjs';

import { Token } from './Token.class';

import { D1Database } from '@cloudflare/workers-types';

type UserStatus = 'active' | 'inactive' | 'banned' | 'deleted';
type UserRole = 'user' | 'admin';

// Full user interface
interface IUser {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	password: string;
	role: UserRole;
	status: UserStatus;
	openIdSub?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

// Interface for creating a new user, based on IUser but omitting id, createdAt, and updatedAt
interface ICreateUser extends Optional<IUser, 'id' | 'createdAt' | 'updatedAt'> {}

interface IUserPublic extends Omit<IUser, 'password'> {}

class User implements IUser {
	id: IUser['id'];
	firstName: IUser['firstName'];
	lastName: IUser['lastName'];
	email: IUser['email'];
	phone: IUser['phone'];
	password: IUser['password'];
	role: IUser['role'];
	status: IUser['status'];
	openIdSub: IUser['openIdSub'];
	createdAt: IUser['createdAt'];
	updatedAt: IUser['updatedAt'];

	private static db: D1Database;
	private static saltRounds = 10;

	constructor(
		createUser: ICreateUser,
		id: string = uuidv4(),
		createdAt: Date = new Date(),
		updatedAt: Date = new Date(),
	) {
		this.id = createUser.id ? createUser.id : id;
		this.firstName = createUser.firstName;
		this.lastName = createUser.lastName;
		this.email = createUser.email;
		this.phone = createUser.phone;
		this.password = createUser.password ? createUser.password : hashSync(createUser.password, User.saltRounds);
		this.role = createUser.role;
		this.status = createUser.status;
		this.openIdSub = createUser.openIdSub || null;
		this.createdAt = createUser.createdAt || createdAt;
		this.updatedAt = createUser.updatedAt || updatedAt;
	}

	// Method to convert a plain object to a User instance
	static fromObject(obj: any): User {
		return new User(
			{
				firstName: obj.firstName,
				lastName: obj.lastName,
				email: obj.email,
				phone: obj.phone,
				password: obj.password,
				role: obj.role,
				status: obj.status,
				openIdSub: obj.openIdSub,
			},
			obj.id,
			new Date(obj.createdAt),
			new Date(obj.updatedAt),
		);
	}

	// Method to convert a User instance to a plain object
	toObject(): IUser {
		return {
			id: this.id,
			firstName: this.firstName,
			lastName: this.lastName,
			email: this.email,
			phone: this.phone,
			password: this.password,
			role: this.role,
			status: this.status,
			openIdSub: this.openIdSub,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
		};
	}

	exportPublic(): IUserPublic {
		return {
			id: this.id,
			firstName: this.firstName,
			lastName: this.lastName,
			email: this.email,
			phone: this.phone,
			role: this.role,
			status: this.status,
			openIdSub: this.openIdSub,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
		};
	}

	async getAccessTokens(): Promise<Token[]> {
		return Token.findByUserId(this.id);
	}

	async createAccessToken({ device, ipAddress }: { device: string; ipAddress: string }): Promise<Token> {
		if (!this.id) {
			throw new Error('User ID is required to create an access token');
		}

		const existingTokens = await this.getAccessTokens();

		// If there is an existing token for the same device and IP address, return that token if it is still valid
		const existingToken = existingTokens.find(
			token => token.device === device && token.ipAddress === ipAddress && token.expiresAt > new Date(),
		);
		console.log(existingToken);

		if (existingToken) {
			return existingToken;
		}

		const token = await Token.create({
			userId: this.id,
			type: 'access',
			device,
			ipAddress,
		});

		return token;
	}

	// Initialize the database connection
	static initialize(db: D1Database) {
		this.db = db;
	}

	// Static method to create a new user
	static async create(createUser: ICreateUser): Promise<User> {
		const user = new User(createUser);
		await this.db
			.prepare(
				`INSERT INTO users (id, firstName, lastName, email, phone, password, role, status, openIdSub, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				user.id,
				user.firstName,
				user.lastName,
				user.email,
				user.phone,
				user.password,
				user.role,
				user.status,
				user.openIdSub,
				user.createdAt.toISOString(),
				user.updatedAt.toISOString(),
			)
			.run();
		return user;
	}

	// Static method to read (find) a user by ID
	static async findById(id: string): Promise<User | undefined> {
		const row = await this.db.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first();
		if (row) {
			return this.fromObject(row);
		}
		return undefined;
	}

	// Static method to find a user by field
	static async findByField(field: string, value: string): Promise<User | undefined> {
		const row = await this.db.prepare(`SELECT * FROM users WHERE ${field} = ?`).bind(value).first();
		if (row) {
			return this.fromObject(row);
		}
		return undefined;
	}

	// Static method to find a user by token
	static async findByToken(token: string): Promise<User | undefined> {
		const row = await this.db
			.prepare(
				`
				SELECT users.*
				FROM users
				INNER JOIN tokens ON users.id = tokens.userId
				WHERE tokens.token = ? AND tokens.expiresAt > ?
			`,
			)
			.bind(token, new Date().toISOString())
			.first();

		if (row) {
			return this.fromObject(row);
		}
		return undefined;
	}

	// Static method to find all users
	static async findAll(): Promise<User[]> {
		const rows = await this.db.prepare(`SELECT * FROM users`).all();
		return rows.results.map((row: any) => this.fromObject(row));
	}

	// Static method to update a user by ID
	static async update(id: string, updateUser: Partial<ICreateUser>): Promise<User | undefined> {
		const user = await this.findById(id);
		if (!user) {
			return undefined;
		}

		const passwordDidChange = updateUser.password && !compareSync(updateUser.password, user.password);
		const updatedAt = new Date();

		Object.assign(user, updateUser, { updatedAt });
		await this.db
			.prepare(
				`UPDATE users SET firstName = ?, lastName = ?, email = ?, phone = ?, password = ?, role = ?, status = ?, openIdSub = ?, updatedAt = ? WHERE id = ?`,
			)
			.bind(
				user.firstName,
				user.lastName,
				user.email,
				user.phone,
				passwordDidChange ? hashSync(user.password, User.saltRounds) : user.password,
				user.role,
				user.status,
				user.openIdSub,
				updatedAt,
				id,
			)
			.run();

		return user;
	}

	// Static method to delete a user by ID
	static async delete(id: string): Promise<boolean> {
		const result = await this.db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
		return result ? true : false;
	}

	// Compare password
	comparePassword(password: string): boolean {
		console.log(password, this.password);
		return compareSync(password, this.password);
	}
}

export { User };
export type { IUser, ICreateUser, IUserPublic };
