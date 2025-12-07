/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL: string;
}

// biome-ignore lint/correctness/noUnusedVariables: Used by Vite to augment import.meta
interface ImportMeta {
	readonly env: ImportMetaEnv;
}
