---
title: Users API
description: User profile management, avatar upload, and preferences endpoints
---

# 👤 Users API

## Overview

The Users domain handles user profile management, avatar uploads, user search, and preferences. Users are created through the Authentication flow and managed here.

---

## 📌 Quick Reference

### MVP Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `user.getProfile` | Query | Yes | Get current user's profile |
| `user.getById` | Query | Yes | Get any user's public profile |
| `user.updateProfile` | Mutation | Yes | Update name, bio, etc. |
| `user.uploadAvatar` | Mutation | Yes | Upload profile picture |

### Future Endpoints

#### Post-Launch (Month 1-2)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `user.updatePreferences` | Mutation | Yes | Update app preferences | High |
| `user.search` | Query | Yes | Search users by name/email | High |

#### Growth (Month 3-6)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `user.getActivity` | Query | Yes | Activity feed | Medium |
| `user.block` | Mutation | Yes | Block a user | Low |
| `user.unblock` | Mutation | Yes | Unblock a user | Low |

#### Scale (Month 6+)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `user.export` | Query | Yes | Export user data (GDPR) | High |
| `user.delete` | Mutation | Yes | Delete account | High |

---

## 📦 Data Models

### User

```typescript
interface User {
  id: string;                      // MongoDB ObjectId
  email: string;                   // Unique email
  name: string;                    // Display name
  emailVerified: boolean;          // Email verification status
  image?: string;                  // Avatar URL
  bio?: string;                    // Profile bio
  title?: string;                  // Job title
  company?: string;                // Company name
  location?: string;               // Location
  website?: string;                // Personal website
  createdAt: DateTime;             // Registration date
  updatedAt: DateTime;             // Last update
}
```

### UserPreferences

```typescript
interface UserPreferences {
  userId: string;
  
  // Notification preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  notifyOnComment: boolean;
  notifyOnMention: boolean;
  notifyOnShare: boolean;
  
  // App preferences
  theme: 'light' | 'dark' | 'system';
  language: string;                // ISO 639-1 code
  timezone: string;                // IANA timezone
  
  // Video preferences
  autoplayVideos: boolean;
  defaultQuality: 'auto' | '360p' | '720p' | '1080p';
}
```

### Prisma Schema

```prisma
model User {
  id            String    @id @map("_id")
  name          String
  email         String
  emailVerified Boolean
  image         String?
  bio           String?
  title         String?
  company       String?
  location      String?
  website       String?
  createdAt     DateTime
  updatedAt     DateTime
  
  sessions      Session[]
  accounts      Account[]
  projects      ProjectMember[]
  videos        Video[]
  comments      Comment[]

  @@unique([email])
  @@map("user")
}
```

---

## 🚀 MVP Endpoints

### 1. user.getProfile

**Status:** ✅ MVP

**Purpose:** Get the current authenticated user's full profile

**Type:** Query

**Auth Required:** Yes

**Input Schema:**

```typescript
{} // No input - returns current user
```

**Response Schema:**

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string;
    bio?: string;
    title?: string;
    company?: string;
    location?: string;
    website?: string;
    createdAt: DateTime;
    updatedAt: DateTime;
  };
}
```

**Example Request:**

```typescript
const { user } = await trpc.user.getProfile.query();

console.log(user.name); // "John Doe"
console.log(user.email); // "john@example.com"
```

**Example Response:**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "image": "https://cdn.artellio.com/avatars/john.jpg",
    "bio": "Video producer and creative director",
    "title": "Creative Director",
    "company": "Acme Studios",
    "location": "San Francisco, CA",
    "website": "https://johndoe.com",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-16T14:20:00Z"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in

**Business Rules:**

1. Only current user can view their own full profile (including email)
2. Cached for 5 minutes (session cache)
3. Returns all profile fields (including private ones)

**Use Cases:**

- Display user info in settings/profile page
- Pre-fill forms with user data
- Show current user in navigation

---

### 2. user.getById

**Status:** ✅ MVP

**Purpose:** Get any user's public profile by ID

**Type:** Query

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  id: z.string(), // User ID to fetch
}
```

**Response Schema:**

```typescript
{
  user: {
    id: string;
    name: string;
    image?: string;
    bio?: string;
    title?: string;
    company?: string;
    location?: string;
    website?: string;
    // Note: email and emailVerified are EXCLUDED for privacy
  };
}
```

**Example Request:**

```typescript
const { user } = await trpc.user.getById.query({
  id: "507f1f77bcf86cd799439011",
});
```

**Example Response:**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "image": "https://cdn.artellio.com/avatars/john.jpg",
    "bio": "Video producer and creative director",
    "title": "Creative Director",
    "company": "Acme Studios"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `NOT_FOUND` - User does not exist

**Business Rules:**

1. Email address NEVER exposed (privacy)
2. Only public profile fields returned
3. User must be authenticated to view other profiles
4. Cached for 10 minutes

**Security Notes:**

- **Email excluded** to prevent email harvesting
- **emailVerified excluded** (private info)
- Public profile only (no sensitive data)

---

### 3. user.updateProfile

**Status:** ✅ MVP

**Purpose:** Update current user's profile information

**Type:** Mutation

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  name: z.string().min(1).max(100).trim().optional(),
  bio: z.string().max(500).optional(),
  title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional(),
}
```

**Response Schema:**

```typescript
{
  user: User; // Updated user object
}
```

**Example Request:**

```typescript
const { user } = await trpc.user.updateProfile.mutate({
  name: "John Smith",
  bio: "Senior video editor with 10 years experience",
  title: "Senior Video Editor",
  company: "New Company Inc",
});
```

**Example Response:**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Smith",
    "bio": "Senior video editor with 10 years experience",
    "title": "Senior Video Editor",
    "company": "New Company Inc",
    "updatedAt": "2025-01-16T15:30:00Z"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `BAD_REQUEST` - Invalid input (e.g., name too long, invalid URL)

**Business Rules:**

1. All fields optional (partial update)
2. Only provided fields are updated
3. Name cannot be empty string
4. Website must be valid URL
5. Bio limited to 500 characters
6. Updates `updatedAt` timestamp automatically

**Database Operations:**

```typescript
const user = await db.user.update({
  where: { id: ctx.session.user.id },
  data: {
    ...(input.name && { name: input.name }),
    ...(input.bio !== undefined && { bio: input.bio }),
    ...(input.title !== undefined && { title: input.title }),
    ...(input.company !== undefined && { company: input.company }),
    ...(input.location !== undefined && { location: input.location }),
    ...(input.website !== undefined && { website: input.website }),
    updatedAt: new Date(),
  },
});
```

**Side Effects:**

- User's profile updated
- `updatedAt` timestamp set
- Profile cache invalidated

---

### 4. user.uploadAvatar

**Status:** ✅ MVP

**Purpose:** Upload a profile picture/avatar

**Type:** Mutation

**Auth Required:** Yes

**Input Schema:**

```typescript
{
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(5 * 1024 * 1024), // 5MB max
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
}
```

**Response Schema:**

```typescript
{
  uploadUrl: string;               // Pre-signed S3 URL
  uploadFields: Record<string, string>; // Form fields
  avatarUrl: string;               // Final avatar URL (after upload)
}
```

**Example Request:**

```typescript
// 1. Request upload URL
const { uploadUrl, uploadFields, avatarUrl } = await trpc.user.uploadAvatar.mutate({
  fileName: "avatar.jpg",
  fileSize: avatarFile.size,
  mimeType: avatarFile.type,
});

// 2. Upload to S3
const formData = new FormData();
Object.entries(uploadFields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', avatarFile);

await fetch(uploadUrl, {
  method: 'POST',
  body: formData,
});

// 3. Avatar now available at avatarUrl
console.log(avatarUrl); // "https://cdn.artellio.com/avatars/user-id.jpg"
```

**Example Response:**

```json
{
  "uploadUrl": "https://s3.amazonaws.com/artellio-avatars/...",
  "uploadFields": {
    "key": "avatars/507f1f77bcf86cd799439011.jpg",
    "policy": "...",
    "signature": "..."
  },
  "avatarUrl": "https://cdn.artellio.com/avatars/507f1f77bcf86cd799439011.jpg"
}
```

**Error Codes:**

- `UNAUTHORIZED` - Not logged in
- `BAD_REQUEST` - Invalid file type or size exceeds limit
- `PAYLOAD_TOO_LARGE` - File exceeds 5MB

**Business Rules:**

1. Image files only (JPEG, PNG, WebP, GIF)
2. Maximum 5MB file size
3. Image automatically resized to 512x512px
4. Previous avatar replaced (not versioned)
5. Pre-signed URL expires in 1 hour

**Image Processing:**

After upload, server-side processing:
1. Resize to 512x512px (square crop)
2. Compress to <200KB
3. Generate WebP version for modern browsers
4. Store original + optimized versions
5. Update user record with new avatar URL

**Side Effects:**

- Avatar uploaded to S3/CDN
- User's `image` field updated
- Old avatar deleted (if exists)
- Profile cache invalidated

**Related Endpoints:**

- `user.getProfile` - View updated avatar
- `user.updateProfile` - Update other profile fields

---

## 🔮 Future Endpoints

### Post-Launch

#### user.updatePreferences
**Priority:** High  
**Purpose:** Update user preferences (theme, notifications, etc.)  
**Why Later:** MVP uses sensible defaults, preferences enhance UX  
**Complexity:** Medium (preference storage, validation)

**Input:**
```typescript
{
  theme: z.enum(['light', 'dark', 'system']).optional(),
  emailNotifications: z.boolean().optional(),
  notifyOnComment: z.boolean().optional(),
  autoplayVideos: z.boolean().optional(),
  defaultQuality: z.enum(['auto', '360p', '720p', '1080p']).optional(),
}
```

---

#### user.search
**Priority:** High  
**Purpose:** Search for users by name or email (for @mentions, sharing)  
**Why Later:** Not needed until collaboration features mature  
**Complexity:** Medium (search indexing, privacy concerns)

**Input:**
```typescript
{
  query: z.string().min(2),
  limit: z.number().min(1).max(50).default(10),
}
```

**Response:**
```typescript
{
  users: Array<{
    id: string;
    name: string;
    image?: string;
    email?: string; // Only if user is in same project/team
  }>;
}
```

**Privacy:**
- Only returns users you've collaborated with
- Email only shown if shared project/team
- Rate limited to prevent data scraping

---

### Growth Phase

#### user.getActivity
**Priority:** Medium  
**Purpose:** Get user's activity feed (comments, uploads, shares)  
**Why Later:** Analytics feature, nice-to-have  
**Complexity:** Medium (activity aggregation)

**Response:**
```typescript
{
  activities: Array<{
    type: 'comment' | 'upload' | 'share' | 'mention';
    timestamp: DateTime;
    metadata: Record<string, unknown>;
  }>;
}
```

---

#### user.block
**Priority:** Low  
**Purpose:** Block another user (hide their content, prevent collaboration)  
**Why Later:** Moderation feature, unlikely needed early  
**Complexity:** Medium (cascading hide logic)

---

#### user.unblock
**Priority:** Low  
**Purpose:** Unblock a previously blocked user  
**Complexity:** Simple (inverse of block)

---

### Scale Phase

#### user.export
**Priority:** High (GDPR compliance)  
**Purpose:** Export all user data (videos, comments, projects)  
**Why Later:** Required for GDPR but not MVP blocker  
**Complexity:** Complex (data aggregation, archiving)

**Response:**
```typescript
{
  exportUrl: string; // Pre-signed download URL for ZIP archive
  expiresAt: DateTime;
}
```

**Contents:**
- JSON files with all user data
- Video files
- Comments CSV
- Profile information

---

#### user.delete
**Priority:** High (GDPR compliance)  
**Purpose:** Permanently delete user account  
**Why Later:** Required for GDPR but complex cascade logic  
**Complexity:** Very Complex (soft delete, data retention, cascades)

**Business Rules:**
- 30-day soft delete grace period
- Email confirmation required
- Transfer or delete owned projects
- Anonymize comments (keep content but remove authorship)
- Delete all personal data after 30 days

---

## 🔒 Privacy & Security

### Profile Visibility

**Public Fields** (visible to all authenticated users):
- name
- image
- bio
- title
- company
- location
- website

**Private Fields** (only visible to owner):
- email
- emailVerified
- preferences
- account details

### Data Protection

1. **Email Privacy:** Never exposed in `getById` endpoint
2. **Search Privacy:** Only findable by users in shared projects
3. **Avatar URLs:** Public but non-enumerable (random filenames)
4. **GDPR Compliance:** Export and delete endpoints (Scale phase)

---

## 🧪 Testing Scenarios

### MVP Testing
- [ ] Get own profile
- [ ] Get another user's profile (email hidden)
- [ ] Update profile with valid data
- [ ] Update profile with invalid URL
- [ ] Upload avatar (JPEG)
- [ ] Upload avatar (PNG)
- [ ] Upload avatar exceeding 5MB (should fail)
- [ ] Upload non-image file (should fail)
- [ ] Avatar displayed in comments/project members

### Security Testing
- [ ] Email not exposed in getById
- [ ] Cannot update another user's profile
- [ ] XSS attempts in bio/name sanitized
- [ ] URL validation enforced for website

---

## 📚 Related Documentation

- [Authentication API](./01-authentication) - User creation and login
- [Projects API](./03-projects) - Project members
- [Comments API](./05-comments) - Comment authorship

---

## 🔗 External Resources

- [GDPR Compliance Guide](https://gdpr.eu/)
- [Profile Image Best Practices](https://web.dev/image-component/)
