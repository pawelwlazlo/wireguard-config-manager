declare module '*.svg' {
	const content: {
		src: string;
		width: number;
		height: number;
	};
	export default content;
}
