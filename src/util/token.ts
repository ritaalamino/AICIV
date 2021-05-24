import { Secret, sign, SignOptions, verify } from "jsonwebtoken";
import { promisify } from 'util';
import { JWT_SECRET, JWT_LIFETIME } from '../configs/constants'

export async function generate<T extends Object>(payload: T, lifetime?: string | number): Promise<any> {
	const token = await promisify<T, Secret, SignOptions>(
		sign,
	)(payload, JWT_SECRET, {
		expiresIn: lifetime || JWT_LIFETIME,
	});
	return token
}

export function decode<T extends Object>(token: string): T | null {
	try {
		const decodedToken = verify(token, JWT_SECRET) as T;
		return decodedToken;
	} catch (e) {
		return null;
	}
}