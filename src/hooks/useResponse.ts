export default function useResponse<T>() {
	const success = (data: T) => {
		return new Response(
			JSON.stringify({
				success: true,
				data,
			}),
			{
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	};

	const error = (message: string, status: number = 400) => {
		return new Response(
			JSON.stringify({
				success: false,
				message,
			}),
			{
				status,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	};

	return {
		success,
		error,
	};
}
