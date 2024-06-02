import { User } from '../classes/User.class';

import usePost from '../hooks/usePost';
import useResponse from '../hooks/useResponse';

import { IUserPublic } from '../classes/User.class';

interface ILoginRequest {
	email: string;
	password: string;
}

interface ILoginResponse {
	token: string;
	user: IUserPublic;
}

const failLoginMessage = 'Invalid email or password';

export default async function routeLogin(request: Request) {
	const post = usePost<ILoginRequest>(request);

	post.requireParam('email');
	post.requireParam('password');

	const response = useResponse<ILoginResponse>();

	try {
		const data = await post.getObject();

		const user = await User.findByField('email', data.email);

		if (!user) {
			return response.error(failLoginMessage, 400);
		}

		if (!user.comparePassword(data.password)) {
			return response.error(failLoginMessage, 400);
		}

		const deviceId = 'not-implemented'; // TODO: Implement device ID based on user agent, etc.

		const token = await user.createAccessToken({
			device: deviceId,
			ipAddress:
				request.headers.get('CF-Connecting-IP') ||
				request.headers.get('X-Forwarded-For') ||
				request.headers.get('X-Real-IP') ||
				request.headers.get('X-Client-IP') ||
				request.headers.get('X-Host') ||
				'',
		});
		const userData = user.exportPublic();

		return response.success({
			token: token.token,
			user: userData,
		});
	} catch (e: any) {
		return response.error(e.message, 400);
	}
}
