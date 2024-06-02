export default async function routeTest(request: Request) {
	return new Response(request.url, {
		headers: {
			'Content-Type': 'text/plain',
		},
	});
}
