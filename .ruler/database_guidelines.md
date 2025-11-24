# Database Guidelines

## Database Stack

- **Database:** MongoDB (NoSQL document database)
- **ORM:** Mongoose v8.14.0
- **Models Location:** `packages/db/src/models/`
- **Connection Export:** `packages/db/src/index.ts`

## Mongoose Configuration

### Project Structure

The project uses a **model-based organization** for better maintainability:

```
packages/db/
├── src/
│   ├── index.ts           # Mongoose connection & exports
│   └── models/            # Mongoose schema models
│       ├── auth.model.ts  # Authentication models
│       ├── user.model.ts  # User-related models
│       └── ...            # Additional domain models
└── package.json
```

### Connection Setup

**`packages/db/src/index.ts`:**

```typescript
import mongoose from "mongoose";

await mongoose.connect(process.env.DATABASE_URL || "").catch((error) => {
	console.log("Error connecting to database:", error);
});

const client = mongoose.connection.getClient().db("myDB");

export { client };
```

**Connection Configuration:**
- Environment variable `DATABASE_URL` contains MongoDB connection string
- Connection happens at module load (top-level await)
- Error handling for connection failures
- Database client exported for advanced operations

### Model Organization

Group related models in separate files by domain:

**Authentication Models (`auth.model.ts`):**
- User
- Session
- Account
- Verification

**Application Models (`user.model.ts`, `post.model.ts`, etc.):**
- Domain-specific models

## Schema Patterns

### Basic Model Definition

```typescript
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema(
	{
		_id: { type: String }, // Custom string ID (Better-Auth compatibility)
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		emailVerified: { type: Boolean, default: false },
		image: { type: String },
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now },
	},
	{
		collection: "user",
		timestamps: true // Automatically manage createdAt/updatedAt
	}
);

export const User = model("User", userSchema);
```

### Field Types

**Common MongoDB field types:**

```typescript
const exampleSchema = new Schema({
	// String types
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	slug: { type: String, unique: true, sparse: true },

	// Number types
	age: { type: Number, min: 0, max: 150 },
	price: { type: Number, default: 0 },
	views: { type: Number, default: 0 },

	// Boolean
	isActive: { type: Boolean, default: true },
	emailVerified: { type: Boolean, default: false },

	// Date/Time
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	publishedAt: { type: Date },
	expiresAt: { type: Date },

	// ObjectId (for references)
	userId: { type: Schema.Types.ObjectId, ref: "User" },

	// Custom String ID (for Better-Auth compatibility)
	customId: { type: String },

	// Arrays
	tags: [{ type: String }],
	categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],

	// Mixed/Any
	metadata: { type: Schema.Types.Mixed },
	settings: { type: Object, default: {} },

	// Buffer (binary data)
	avatar: { type: Buffer },

	// Enum (using enum validator)
	status: {
		type: String,
		enum: ["draft", "published", "archived"],
		default: "draft"
	},
});
```

### Indexes

**Add indexes for queried fields:**

```typescript
const postSchema = new Schema({
	title: { type: String, required: true },
	slug: { type: String, unique: true },
	authorId: { type: Schema.Types.ObjectId, ref: "User" },
	categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
	publishedAt: { type: Date },
	createdAt: { type: Date, default: Date.now },
});

// Single field indexes
postSchema.index({ slug: 1 }); // 1 for ascending, -1 for descending
postSchema.index({ authorId: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ publishedAt: -1 });

// Compound indexes
postSchema.index({ authorId: 1, publishedAt: -1 });
postSchema.index({ categoryId: 1, createdAt: -1 });

// Text index for search
postSchema.index({ title: "text", content: "text" });

// Unique compound index
postSchema.index({ userId: 1, projectId: 1 }, { unique: true });

// Sparse index (only indexes documents that have the field)
postSchema.index({ slug: 1 }, { unique: true, sparse: true });
```

### Schema Options

```typescript
const postSchema = new Schema(
	{
		title: { type: String, required: true },
		content: { type: String },
	},
	{
		// Collection name (overrides default pluralization)
		collection: "post",

		// Automatic timestamps (createdAt, updatedAt)
		timestamps: true,

		// Version key (__v)
		versionKey: false, // Set to false to remove __v field

		// Strict mode (reject fields not in schema)
		strict: true,

		// toJSON and toObject options
		toJSON: {
			virtuals: true, // Include virtual properties
			transform: (doc, ret) => {
				delete ret.__v;
				return ret;
			},
		},
	}
);
```

### Relationships (References)

#### One-to-Many

```typescript
// User model
const userSchema = new Schema({
	_id: { type: String },
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
});

export const User = model("User", userSchema);

// Post model (many posts belong to one user)
const postSchema = new Schema({
	title: { type: String, required: true },
	content: { type: String },
	authorId: { type: String, ref: "User", required: true },
});

postSchema.index({ authorId: 1 });

export const Post = model("Post", postSchema);

// Usage with population
const post = await Post.findById(postId).populate("authorId");
console.log(post.authorId.name); // Access populated user data
```

#### One-to-One

```typescript
// User model
const userSchema = new Schema({
	_id: { type: String },
	name: { type: String, required: true },
	email: { type: String, required: true },
});

export const User = model("User", userSchema);

// Profile model (one profile per user)
const profileSchema = new Schema({
	userId: { type: String, ref: "User", required: true, unique: true },
	bio: { type: String },
	avatar: { type: String },
	website: { type: String },
});

profileSchema.index({ userId: 1 }, { unique: true });

export const Profile = model("Profile", profileSchema);
```

#### Many-to-Many

**Using references array:**

```typescript
// User model
const userSchema = new Schema({
	_id: { type: String },
	name: { type: String, required: true },
	projectIds: [{ type: Schema.Types.ObjectId, ref: "Project" }],
});

export const User = model("User", userSchema);

// Project model
const projectSchema = new Schema({
	name: { type: String, required: true },
	memberIds: [{ type: String, ref: "User" }],
});

export const Project = model("Project", projectSchema);

// Usage
const user = await User.findById(userId).populate("projectIds");
```

**Using join collection (recommended for additional metadata):**

```typescript
// Membership model (join table)
const membershipSchema = new Schema({
	userId: { type: String, ref: "User", required: true },
	projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
	role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
	joinedAt: { type: Date, default: Date.now },
});

membershipSchema.index({ userId: 1, projectId: 1 }, { unique: true });
membershipSchema.index({ userId: 1 });
membershipSchema.index({ projectId: 1 });

export const Membership = model("Membership", membershipSchema);

// Usage
const memberships = await Membership.find({ userId })
	.populate("projectId")
	.exec();
```

### Virtuals

Virtual properties are computed values not stored in MongoDB:

```typescript
const userSchema = new Schema({
	firstName: { type: String },
	lastName: { type: String },
});

// Virtual property
userSchema.virtual("fullName").get(function() {
	return `${this.firstName} ${this.lastName}`;
});

// Virtual setter
userSchema.virtual("fullName").set(function(value) {
	const parts = value.split(" ");
	this.firstName = parts[0];
	this.lastName = parts[1];
});

// Include virtuals in toJSON
userSchema.set("toJSON", { virtuals: true });

export const User = model("User", userSchema);

// Usage
const user = new User({ firstName: "John", lastName: "Doe" });
console.log(user.fullName); // "John Doe"
```

### Middleware (Hooks)

Mongoose middleware allows you to run logic before/after certain operations:

```typescript
const userSchema = new Schema({
	email: { type: String, required: true },
	password: { type: String, required: true },
	updatedAt: { type: Date },
});

// Pre-save hook
userSchema.pre("save", async function(next) {
	// Hash password before saving
	if (this.isModified("password")) {
		this.password = await bcrypt.hash(this.password, 10);
	}

	// Update timestamp
	this.updatedAt = new Date();

	next();
});

// Post-save hook
userSchema.post("save", function(doc, next) {
	console.log("User saved:", doc._id);
	next();
});

// Pre-remove hook
userSchema.pre("remove", async function(next) {
	// Clean up related documents
	await Post.deleteMany({ authorId: this._id });
	next();
});

export const User = model("User", userSchema);
```

### Methods (Instance Methods)

Add custom methods to document instances:

```typescript
const userSchema = new Schema({
	email: { type: String, required: true },
	password: { type: String, required: true },
});

// Instance method
userSchema.methods.verifyPassword = async function(password: string): Promise<boolean> {
	return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAuthToken = function(): string {
	return jwt.sign({ userId: this._id }, process.env.JWT_SECRET || "");
};

export const User = model("User", userSchema);

// Usage
const user = await User.findOne({ email });
const isValid = await user.verifyPassword(password);
if (isValid) {
	const token = user.generateAuthToken();
}
```

### Statics (Model Methods)

Add custom methods to the model itself:

```typescript
const userSchema = new Schema({
	email: { type: String, required: true },
	name: { type: String, required: true },
});

// Static method
userSchema.statics.findByEmail = function(email: string) {
	return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.createWithDefaults = function(userData: { email: string; name: string }) {
	return this.create({
		...userData,
		emailVerified: false,
		createdAt: new Date(),
	});
};

export const User = model("User", userSchema);

// Usage
const user = await User.findByEmail("user@example.com");
const newUser = await User.createWithDefaults({ email: "new@example.com", name: "New User" });
```

## Mongoose Client Usage

### CRUD Operations

#### Create

```typescript
import { User } from "@novi/db";

// Single document
const user = await User.create({
	name: "John Doe",
	email: "john@example.com",
	emailVerified: false,
});

// Multiple documents
const users = await User.insertMany([
	{ name: "User 1", email: "user1@example.com" },
	{ name: "User 2", email: "user2@example.com" },
]);

// Using new + save (triggers middleware)
const user = new User({
	name: "Jane Doe",
	email: "jane@example.com",
});
await user.save();
```

#### Read

```typescript
import { User, Post } from "@novi/db";

// Find by ID
const user = await User.findById(userId);

// Find one
const user = await User.findOne({ email: "user@example.com" });

// Find many
const users = await User.find({ emailVerified: true });

// Find with conditions
const posts = await Post.find({
	authorId: userId,
	published: true,
})
	.sort({ createdAt: -1 })
	.limit(10)
	.select("title content createdAt") // Only select specific fields
	.exec();

// Count
const count = await User.countDocuments({ emailVerified: true });

// Exists
const exists = await User.exists({ email: "user@example.com" });

// Find with population
const post = await Post.findById(postId)
	.populate("authorId", "name email") // Populate specific fields
	.exec();

// Multiple populations
const post = await Post.findById(postId)
	.populate("authorId")
	.populate("categoryId")
	.exec();
```

#### Update

```typescript
import { User, Post } from "@novi/db";

// Find and update (returns updated document)
const user = await User.findByIdAndUpdate(
	userId,
	{ name: "New Name", emailVerified: true },
	{ new: true } // Return updated document
);

// Update one
const result = await User.updateOne(
	{ _id: userId },
	{ $set: { emailVerified: true } }
);

// Update many
const result = await Post.updateMany(
	{ authorId: userId },
	{ $set: { published: false } }
);

// Increment/decrement
const post = await Post.findByIdAndUpdate(
	postId,
	{ $inc: { views: 1 } }, // Increment views by 1
	{ new: true }
);

// Array operations
const user = await User.findByIdAndUpdate(
	userId,
	{ $push: { projectIds: newProjectId } }, // Add to array
	{ new: true }
);

const user = await User.findByIdAndUpdate(
	userId,
	{ $pull: { projectIds: projectId } }, // Remove from array
	{ new: true }
);
```

#### Delete

```typescript
import { User, Post } from "@novi/db";

// Find and delete (returns deleted document)
const deleted = await User.findByIdAndDelete(userId);

// Delete one
const result = await User.deleteOne({ _id: userId });

// Delete many
const result = await Post.deleteMany({ authorId: userId });

// Using remove (triggers middleware)
const user = await User.findById(userId);
await user.remove(); // Calls pre/post remove hooks
```

### Filtering & Querying

```typescript
import { Post } from "@novi/db";

// Basic filters
const posts = await Post.find({
	title: "Hello World", // Exact match
	published: true,
	views: { $gte: 100 }, // Greater than or equal
	createdAt: { $lt: new Date() }, // Less than
	authorId: { $in: [id1, id2, id3] }, // In array
	tags: { $elemMatch: { $eq: "typescript" } }, // Array contains
});

// AND conditions (default)
const posts = await Post.find({
	published: true,
	authorId: userId,
});

// OR conditions
const posts = await Post.find({
	$or: [
		{ title: /typescript/i },
		{ content: /typescript/i },
	],
});

// NOT conditions
const posts = await Post.find({
	status: { $ne: "archived" },
});

// Complex nested conditions
const posts = await Post.find({
	$and: [
		{ published: true },
		{
			$or: [
				{ featured: true },
				{ views: { $gte: 1000 } },
			],
		},
	],
});

// Regular expressions
const posts = await Post.find({
	title: /^Hello/i, // Starts with "Hello" (case insensitive)
});

// Text search (requires text index)
const posts = await Post.find({
	$text: { $search: "typescript tutorial" },
});
```

### Query Operators

```typescript
// Comparison
{ age: { $eq: 25 } }      // Equal
{ age: { $ne: 25 } }      // Not equal
{ age: { $gt: 25 } }      // Greater than
{ age: { $gte: 25 } }     // Greater than or equal
{ age: { $lt: 25 } }      // Less than
{ age: { $lte: 25 } }     // Less than or equal
{ age: { $in: [20, 25, 30] } }    // In array
{ age: { $nin: [20, 25, 30] } }   // Not in array

// Logical
{ $and: [{ age: { $gt: 20 } }, { age: { $lt: 30 } }] }
{ $or: [{ age: { $lt: 20 } }, { age: { $gt: 30 } }] }
{ $not: { age: { $gte: 25 } } }
{ $nor: [{ age: { $lt: 20 } }, { age: { $gt: 30 } }] }

// Element
{ field: { $exists: true } }    // Field exists
{ field: { $type: "string" } }  // Field type

// Array
{ tags: { $all: ["js", "ts"] } }        // Contains all
{ tags: { $elemMatch: { $gte: 80 } } }  // Element matches
{ tags: { $size: 3 } }                  // Array size
```

### Transactions

Use sessions for multi-document transactions:

```typescript
import mongoose from "mongoose";
import { User, Post } from "@novi/db";

const session = await mongoose.startSession();
session.startTransaction();

try {
	// Create user
	const user = await User.create(
		[{ name: "John", email: "john@example.com" }],
		{ session }
	);

	// Create post for user
	await Post.create(
		[{ title: "First Post", authorId: user[0]._id }],
		{ session }
	);

	// Commit transaction
	await session.commitTransaction();
	console.log("Transaction committed");
} catch (error) {
	// Rollback on error
	await session.abortTransaction();
	console.error("Transaction aborted:", error);
} finally {
	session.endSession();
}
```

## Performance Best Practices

### 1. Use `select` to fetch only needed fields

```typescript
// Good - Only fetch needed fields
const users = await User.find()
	.select("name email")
	.exec();

// Bad - Fetches all fields
const users = await User.find();
```

### 2. Add indexes for filtered/sorted fields

```typescript
// Add indexes in schema
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ publishedAt: -1 });
```

### 3. Use lean() for read-only queries

```typescript
// Good - Returns plain JavaScript objects (faster)
const posts = await Post.find().lean().exec();

// Bad - Returns Mongoose documents (slower, but has methods)
const posts = await Post.find().exec();
```

### 4. Use pagination

```typescript
// Offset-based (simpler, slower for large datasets)
const posts = await Post.find()
	.skip((page - 1) * limit)
	.limit(limit)
	.exec();

// Cursor-based (better for large datasets)
const posts = await Post.find({ _id: { $gt: lastId } })
	.limit(limit)
	.exec();
```

### 5. Use population wisely

```typescript
// Good - Only populate needed fields
const post = await Post.findById(postId)
	.populate("authorId", "name email")
	.exec();

// Bad - Populates all fields
const post = await Post.findById(postId)
	.populate("authorId")
	.exec();
```

### 6. Batch operations

```typescript
// Good - Single query
const posts = await Post.find({
	_id: { $in: postIds },
});

// Bad - Multiple queries
const posts = await Promise.all(
	postIds.map((id) => Post.findById(id))
);
```

## Error Handling

```typescript
import { User } from "@novi/db";
import { TRPCError } from "@trpc/server";

try {
	const user = await User.create({
		email: "user@example.com",
		name: "John",
	});
} catch (error) {
	// Duplicate key error (unique constraint)
	if (error.code === 11000) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Email already exists",
		});
	}

	// Validation error
	if (error.name === "ValidationError") {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: error.message,
		});
	}

	// Cast error (invalid ObjectId)
	if (error.name === "CastError") {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid ID format",
		});
	}

	// Unknown error
	throw new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "Database operation failed",
		cause: error,
	});
}
```

**Common Mongoose error codes:**
- `11000` - Duplicate key error (unique constraint violation)
- `ValidationError` - Schema validation failed
- `CastError` - Type casting failed (e.g., invalid ObjectId)
- `DocumentNotFoundError` - Document not found

## Type Safety

### TypeScript Integration

```typescript
import mongoose, { type Document, type Model } from "mongoose";

const { Schema, model } = mongoose;

// Define TypeScript interface
interface IUser {
	_id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// Define methods interface
interface IUserMethods {
	verifyPassword(password: string): Promise<boolean>;
}

// Define statics interface
interface IUserModel extends Model<IUser, object, IUserMethods> {
	findByEmail(email: string): Promise<(Document<unknown, object, IUser> & IUser & IUserMethods) | null>;
}

// Define schema
const userSchema = new Schema<IUser, IUserModel, IUserMethods>({
	_id: { type: String },
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	emailVerified: { type: Boolean, default: false },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// Add instance method
userSchema.methods.verifyPassword = async function(password: string): Promise<boolean> {
	// Implementation
	return true;
};

// Add static method
userSchema.statics.findByEmail = function(email: string) {
	return this.findOne({ email: email.toLowerCase() });
};

export const User = model<IUser, IUserModel>("User", userSchema);

// Usage - Full type safety
const user = await User.findByEmail("user@example.com");
if (user) {
	const isValid = await user.verifyPassword("password");
}
```

## Migration Strategies

### Schema Changes

Unlike Prisma, Mongoose doesn't have a formal migration system. Schema changes are applied at runtime:

**Adding a new field:**
```typescript
// Just add to schema - existing documents won't have it
const userSchema = new Schema({
	// ...existing fields
	newField: { type: String }, // New optional field
});
```

**Removing a field:**
```typescript
// Remove from schema - old data remains in DB until updated
const userSchema = new Schema({
	// ...removed old field
});

// Optional: Clean up old data
await User.updateMany({}, { $unset: { oldField: "" } });
```

**Renaming a field:**
```typescript
// Migration script
await User.updateMany(
	{},
	{ $rename: { oldName: "newName" } }
);
```

**Changing field type:**
```typescript
// Manual migration required
const users = await User.find();
for (const user of users) {
	user.age = Number(user.age); // Convert string to number
	await user.save();
}
```

### Database Seeding

```typescript
import { User, Post } from "@novi/db";

async function seed() {
	// Clear existing data
	await User.deleteMany({});
	await Post.deleteMany({});

	// Create users
	const users = await User.insertMany([
		{ name: "User 1", email: "user1@example.com", emailVerified: true },
		{ name: "User 2", email: "user2@example.com", emailVerified: false },
	]);

	// Create posts
	await Post.insertMany([
		{ title: "Post 1", authorId: users[0]._id, published: true },
		{ title: "Post 2", authorId: users[1]._id, published: false },
	]);

	console.log("Database seeded");
}

seed().catch(console.error);
```

## Best Practices

1. **Always use schemas** - Define schemas for all models
2. **Add indexes** - Index fields used in queries
3. **Use TypeScript** - Define interfaces for type safety
4. **Validate data** - Use schema validators and Zod
5. **Handle errors** - Catch and handle Mongoose errors
6. **Use lean() for reads** - Better performance for read-only operations
7. **Use select()** - Only fetch needed fields
8. **Use transactions** - For multi-document operations
9. **Add middleware** - For hooks like password hashing
10. **Monitor queries** - Log slow queries in development

---
