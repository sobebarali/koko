import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema/index";

// Lazy initialization to avoid creating client at module import time
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
	if (!_db) {
		const client = createClient({
			url: process.env.DATABASE_URL || "",
			authToken: process.env.DATABASE_AUTH_TOKEN,
		});
		_db = drizzle({ client, schema });
	}
	return _db;
}

// Export a Proxy that lazily initializes the database
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_target, prop) {
		return Reflect.get(getDb(), prop);
	},
});
