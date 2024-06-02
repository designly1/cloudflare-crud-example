export default function usePost<T>(request: Request) {
	const body: any = {};

	const requiredParams: string[] = [];
	const requireParam = (param: string) => {
		requiredParams.push(param);
	};

	const validateParams = () => {
		for (const param of requiredParams) {
			if (!body[param]) {
				throw new Error(`Missing required parameter: ${param}`);
			}
		}
	};

	const getObject = async () => {
		try {
			const json = await request.json();
			Object.assign(body, json);
		} catch (e) {
			throw new Error('Invalid JSON Request');
		}

		validateParams();

		return body as T;
	};

	return {
		requireParam,
		getObject,
	};
}
