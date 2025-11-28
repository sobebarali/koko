import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../apps/server/.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations(): Promise<void> {
	const client = createClient({
		url: process.env.DATABASE_URL || "",
		authToken: process.env.DATABASE_AUTH_TOKEN,
	});

	console.log("Running migrations...");

	// Only run the new migration (0001)
	const migrationSQL = readFileSync(
		join(__dirname, "migrations", "0001_add_bunny_collection_id.sql"),
		"utf-8",
	);

	try {
		await client.execute(migrationSQL);
		console.log("Migration 0001_add_bunny_collection_id applied successfully!");
	} catch (error) {
		// Check if the error is because the column already exists
		if (
			error instanceof Error &&
			error.message.includes("duplicate column name")
		) {
			console.log(
				"Column bunny_collection_id already exists, skipping migration.",
			);
		} else {
			throw error;
		}
	}

	console.log("Migrations completed successfully!");

	client.close();
}

runMigrations().catch((error) => {
	console.error("Migration failed:", error);
	process.exit(1);
});
