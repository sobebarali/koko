import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

// Lazy initialization to avoid creating client at module import time
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
	if (!_db) {
		const client = createClient({
			url: process.env.DATABASE_URL || "",
			authToken: process.env.DATABASE_AUTH_TOKEN,
		});
		_db = drizzle({ client });
	}
	return _db;
}

// Export a Proxy that lazily initializes the database
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(_target, prop) {
		return Reflect.get(getDb(), prop);
	},
});
