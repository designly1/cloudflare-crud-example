// Import CRUD Classes
import { User } from './classes/User.class';
import { Token } from './classes/Token.class';

// Import Tiny Request Router
import { Router, Method, Params } from 'tiny-request-router';

// Import route handlers
import routeTest from './routes/test';
import routeLogin from './routes/login';
import routeParams from './routes/params';

type Handler = (params: Params) => Promise<Response>;

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const { DB } = env;

		// Initialize CRUD classes with the database connection
		User.initialize(DB);
		Token.initialize(DB);

		// Initialize the router and define routes
		const router = new Router<Handler>();
		router.get('/test', () => routeTest(request));
		router.post('/login', () => routeLogin(request));

		// Define a route with a URL filename parameter called "foo"
		router.get('/params/:foo', params => routeParams(request, params));

		const { pathname } = new URL(request.url);
		const match = router.match(request.method as Method, pathname);

		if (match) {
			// Call the matched route handler with the URL parameters
			return match.handler(match.params);
		} else {
			// Return a 404 Not Found response if no route matches
			return new Response('Not Found', { status: 404 });
		}
	},
};
