export function getPool(): any;
export function query(text: string, params?: any[]): Promise<any>;
export function transaction(callback: (client: any) => Promise<any>): Promise<any>;
export function closePool(): Promise<void>;