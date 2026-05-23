export const toArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
