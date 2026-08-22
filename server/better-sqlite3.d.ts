declare module "better-sqlite3" {
  type Statement = { run: (...params: unknown[]) => unknown; all: (...params: unknown[]) => unknown[] };
  type DatabaseInstance = { exec: (sql: string) => void; prepare: (sql: string) => Statement; transaction: (fn: () => void) => () => void };
  const Database: new (path: string) => DatabaseInstance;
  export default Database;
}
