declare interface ApiResponse {
	success: boolean;
	message?: string;
	data?: any;
}

declare type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
