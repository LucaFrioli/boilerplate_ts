/**
 * DeepDeepReadonly
 * Tipagem que garante que objetos não sejma mutaveis independente de serem aninhados
 */
export type DeepReadonly<T> = {
	readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
