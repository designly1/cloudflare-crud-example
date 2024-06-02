import { Params } from 'tiny-request-router';

export default async function routeParams(request: Request, params: Params) {
	return new Response(JSON.stringify(params), {
		headers: {
			'Content-Type': 'application/json',
		},
	});
}
