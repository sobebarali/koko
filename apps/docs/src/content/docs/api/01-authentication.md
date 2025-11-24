---
title: Authentication API
description: User registration, login, session management, and password reset endpoints
---

# 🔐 Authentication API

## Overview

The Authentication domain handles user registration, login, logout, session management, and password reset functionality. Built on Better-Auth v1.3.28 with MongoDB session storage.

---

## 📌 Quick Reference

### MVP Endpoints
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `auth.signUp` | Mutation | No | Register new user |
| `auth.signIn` | Mutation | No | Login with email/password |
| `auth.signOut` | Mutation | Yes | Logout current session |
| `auth.getSession` | Query | Yes | Get current session details |

### Future Endpoints

#### Post-Launch (Month 1-2)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `auth.verifyEmail` | Mutation | No | Verify email address | High |
| `auth.requestPasswordReset` | Mutation | No | Request password reset | High |
| `auth.resetPassword` | Mutation | No | Reset password with token | High |
| `auth.changePassword` | Mutation | Yes | Change password (logged in) | Medium |

#### Growth (Month 3-6)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `auth.oauth.google` | Mutation | No | Sign in with Google | High |
| `auth.oauth.github` | Mutation | No | Sign in with GitHub | Medium |
| `auth.listSessions` | Query | Yes | List all active sessions | Medium |
| `auth.revokeSession` | Mutation | Yes | Revoke specific session | Medium |

#### Scale (Month 6+)
| Endpoint | Type | Auth | Purpose | Priority |
|----------|------|------|---------|----------|
| `auth.twoFactor.enable` | Mutation | Yes | Enable 2FA | High |
| `auth.twoFactor.verify` | Mutation | Yes | Verify 2FA code | High |

---

## 📦 Data Models

### User

```typescript
interface User {
  id: string;                      // MongoDB ObjectId
  email: string;                   // Unique email address
  name: string;                    // Display name
  emailVerified: boolean;          // Email verification status
  image?: string;                  // Avatar URL
  createdAt: DateTime;             // Registration date
  updatedAt: DateTime;             // Last profile update
}
```

### Session

```typescript
interface Session {
  id: string;                      // MongoDB ObjectId
  token: string;                   // Unique session token (hashed)
  userId: string;                  // User ID
  expiresAt: DateTime;             // Session expiration
  ipAddress?: string;              // Client IP
  userAgent?: string;              // Client user agent
  createdAt: DateTime;             // Session creation time
  updatedAt: DateTime;             // Last activity time
}
```

### Account

```typescript
interface Account {
  id: string;                      // MongoDB ObjectId
  userId: string;                  // User ID
  accountId: string;               // Provider-specific account ID
  providerId: string;              // Auth provider (email, google, github)
  password?: string;               // Hashed password (email provider only)
  accessToken?: string;            // OAuth access token
  refreshToken?: string;           // OAuth refresh token
  idToken?: string;                // OAuth ID token
  accessTokenExpiresAt?: DateTime;
  refreshTokenExpiresAt?: DateTime;
  scope?: string;                  // OAuth scopes
  createdAt: DateTime;
  updatedAt: DateTime;
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
  createdAt     DateTime
  updatedAt     DateTime
  sessions      Session[]
  accounts      Account[]

  @@unique([email])
  @@map("user")
}

model Session {
  id        String   @id @map("_id")
  expiresAt DateTime
  token     String
  createdAt DateTime
  updatedAt DateTime
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([token])
  @@map("session")
}

model Account {
  id                    String    @id @map("_id")
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime
  updatedAt             DateTime

  @@map("account")
}

model Verification {
  id         String    @id @map("_id")
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime?
  updatedAt  DateTime?

  @@map("verification")
}
```

---

## 🚀 MVP Endpoints

### 1. auth.signUp

**Status:** ✅ MVP

**Purpose:** Register a new user account with email and password

**Type:** Mutation

**Auth Required:** No

**Input Schema:**

```typescript
{
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(100).trim(),
}
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
    createdAt: DateTime;
  };
  session: {
    id: string;
    token: string;
    expiresAt: DateTime;
  };
}
```

**Example Request:**

```typescript
const result = await trpc.auth.signUp.mutate({
  email: "john@example.com",
  password: "SecurePass123!",
  name: "John Doe",
});

// Session cookie automatically set by Better-Auth
console.log(result.user.id); // "507f1f77bcf86cd799439011"
```

**Example Response:**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "session": {
    "id": "507f1f77bcf86cd799439012",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2025-01-22T10:30:00Z"
  }
}
```

**Error Codes:**

- `BAD_REQUEST` - Invalid email format or password too short/long
- `CONFLICT` - Email already registered
- `TOO_MANY_REQUESTS` - Too many signup attempts (5/min per IP)

**Business Rules:**

1. Email must be unique across all users
2. Email automatically converted to lowercase
3. Password must be 8-72 characters (bcrypt limit)
4. Password hashed with bcrypt (never stored plaintext)
5. Email verification defaults to `false` (verify in Post-Launch phase)
6. Session created automatically with 7-day expiration
7. Session cookie set as HttpOnly, Secure (production), SameSite=lax

**Database Operations:**

```typescript
// 1. Check if email already exists
const existing = await db.user.findUnique({
  where: { email: input.email.toLowerCase() },
});

if (existing) {
  throw new TRPCError({ code: 'CONFLICT', message: 'Email already registered' });
}

// 2. Hash password
const hashedPassword = await bcrypt.hash(input.password, 10);

// 3. Create user and account (transaction)
const user = await db.user.create({
  data: {
    email: input.email.toLowerCase(),
    name: input.name,
    emailVerified: false,
    accounts: {
      create: {
        providerId: 'email',
        accountId: input.email.toLowerCase(),
        password: hashedPassword,
      },
    },
  },
});

// 4. Create session
const session = await db.session.create({
  data: {
    userId: user.id,
    token: generateSecureToken(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    ipAddress: ctx.req.ip,
    userAgent: ctx.req.headers['user-agent'],
  },
});
```

**Side Effects:**

- User record created
- Account record created (providerId: 'email')
- Session record created
- Session cookie set in browser
- Welcome notification created (if notification system exists)

**Security Notes:**

- Passwords hashed with bcrypt (cost factor 10)
- Session tokens are cryptographically random (32 bytes)
- Rate limited: 5 signups per minute per IP address
- Email validation prevents common typos

**Related Endpoints:**

- `auth.signIn` - Login after registration
- `auth.verifyEmail` (Post-Launch) - Email verification flow
- `user.getProfile` - Get user details after signup

---

### 2. auth.signIn

**Status:** ✅ MVP

**Purpose:** Authenticate user with email and password

**Type:** Mutation

**Auth Required:** No

**Input Schema:**

```typescript
{
  email: z.string().email().toLowerCase().trim(),
  password: z.string(),
}
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
  };
  session: {
    id: string;
    token: string;
    expiresAt: DateTime;
  };
}
```

**Example Request:**

```typescript
const result = await trpc.auth.signIn.mutate({
  email: "john@example.com",
  password: "SecurePass123!",
});

// Now authenticated - session cookie set
```

**Example Response:**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "image": "https://cdn.artellio.com/avatars/john.jpg"
  },
  "session": {
    "id": "507f1f77bcf86cd799439013",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2025-01-22T10:30:00Z"
  }
}
```

**Error Codes:**

- `BAD_REQUEST` - Invalid email format
- `UNAUTHORIZED` - Invalid email or password
- `TOO_MANY_REQUESTS` - Too many login attempts (5/min per IP)

**Business Rules:**

1. Email and password both required
2. Email case-insensitive comparison
3. Password verified using bcrypt
4. Failed login attempts do not reveal whether email exists (security)
5. Generic error message: "Invalid email or password"
6. New session created on successful login
7. Old sessions remain valid (multi-device support)

**Database Operations:**

```typescript
// 1. Find user by email
const user = await db.user.findUnique({
  where: { email: input.email.toLowerCase() },
  include: {
    accounts: {
      where: { providerId: 'email' },
    },
  },
});

// 2. Verify password
const account = user?.accounts[0];
const validPassword = account?.password 
  ? await bcrypt.compare(input.password, account.password)
  : false;

// 3. Generic error if user not found or password invalid
if (!user || !validPassword) {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'Invalid email or password',
  });
}

// 4. Create new session
const session = await db.session.create({
  data: {
    userId: user.id,
    token: generateSecureToken(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: ctx.req.ip,
    userAgent: ctx.req.headers['user-agent'],
  },
});
```

**Side Effects:**

- New session created
- Session cookie set in browser
- User's `updatedAt` timestamp updated
- Login event logged for security audit

**Security Notes:**

- Constant-time password comparison (bcrypt)
- Rate limited: 5 attempts per minute per IP
- Generic error messages prevent user enumeration
- Session tokens are secure random (not predictable)
- Failed attempts logged for security monitoring

**Related Endpoints:**

- `auth.signOut` - Logout
- `auth.getSession` - Verify session
- `auth.requestPasswordReset` (Post-Launch) - Forgot password

---

### 3. auth.signOut

**Status:** ✅ MVP

**Purpose:** Logout current user session

**Type:** Mutation

**Auth Required:** Yes

**Input Schema:**

```typescript
{} // No input required
```

**Response Schema:**

```typescript
{
  success: boolean;
}
```

**Example Request:**

```typescript
await trpc.auth.signOut.mutate();

// Session cookie cleared, user logged out
```

**Example Response:**

```json
{
  "success": true
}
```

**Error Codes:**

- `UNAUTHORIZED` - No active session

**Business Rules:**

1. Deletes current session from database
2. Clears session cookie from browser
3. Other sessions remain active (only logs out current device)
4. Safe to call multiple times (idempotent)

**Database Operations:**

```typescript
// 1. Get session from context
const sessionId = ctx.session.id;

// 2. Delete session
await db.session.delete({
  where: { id: sessionId },
});

// 3. Clear cookie
ctx.res.clearCookie('better-auth.session_token');
```

**Side Effects:**

- Session record deleted
- Session cookie cleared
- Logout event logged for security audit

**Related Endpoints:**

- `auth.signIn` - Login again
- `auth.revokeSession` (Growth) - Logout from specific device

---

### 4. auth.getSession

**Status:** ✅ MVP

**Purpose:** Get current authenticated session details

**Type:** Query

**Auth Required:** Yes

**Input Schema:**

```typescript
{} // No input required
```

**Response Schema:**

```typescript
{
  session: {
    id: string;
    expiresAt: DateTime;
    createdAt: DateTime;
    ipAddress?: string;
    userAgent?: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string;
  };
}
```

**Example Request:**

```typescript
const { session, user } = await trpc.auth.getSession.query();

console.log(user.name); // "John Doe"
console.log(session.expiresAt); // "2025-01-22T10:30:00Z"
```

**Example Response:**

```json
{
  "session": {
    "id": "507f1f77bcf86cd799439013",
    "expiresAt": "2025-01-22T10:30:00Z",
    "createdAt": "2025-01-15T10:30:00Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "image": "https://cdn.artellio.com/avatars/john.jpg"
  }
}
```

**Error Codes:**

- `UNAUTHORIZED` - No active session or session expired

**Business Rules:**

1. Returns currently authenticated session and user
2. Updates session's `updatedAt` timestamp (activity tracking)
3. Session automatically renewed if close to expiration
4. Cached for 5 minutes (cookie cache)

**Database Operations:**

```typescript
// 1. Session already loaded in context middleware
const session = ctx.session;

// 2. Load user details
const user = await db.user.findUnique({
  where: { id: session.userId },
  select: {
    id: true,
    email: true,
    name: true,
    emailVerified: true,
    image: true,
  },
});

// 3. Update session activity timestamp
await db.session.update({
  where: { id: session.id },
  data: { updatedAt: new Date() },
});
```

**Use Cases:**

- Check if user is logged in
- Display user info in navigation
- Verify session validity before sensitive operations
- Show session expiration warning

**Related Endpoints:**

- `user.getProfile` - Full user profile with preferences
- `auth.signOut` - Logout

---

## 🔮 Future Endpoints

### Post-Launch

#### auth.verifyEmail
**Priority:** High  
**Purpose:** Verify user's email address with verification token  
**Why Later:** Email verification not critical for MVP, can launch without  
**Dependencies:** Email sending service (SendGrid, AWS SES)  
**Complexity:** Medium (token generation, email templates)

**Input:**
```typescript
{
  token: z.string(),
}
```

**Flow:**
1. User registers → Verification email sent
2. User clicks link → Redirects to app with token
3. App calls `auth.verifyEmail` with token
4. User's `emailVerified` set to `true`

---

#### auth.requestPasswordReset
**Priority:** High  
**Purpose:** Request password reset email with secure token  
**Why Later:** Users can contact support for MVP, but self-service is important  
**Complexity:** Medium (email service, token expiration)

**Input:**
```typescript
{
  email: z.string().email(),
}
```

**Response:**
```typescript
{
  success: boolean; // Always true (don't reveal if email exists)
}
```

**Security Notes:**
- Always returns success (even if email doesn't exist)
- Prevents user enumeration
- Token expires in 1 hour
- Token can only be used once

---

#### auth.resetPassword
**Priority:** High  
**Purpose:** Reset password using token from email  
**Why Later:** Requires requestPasswordReset flow first  
**Complexity:** Simple (token validation, password update)

**Input:**
```typescript
{
  token: z.string(),
  newPassword: z.string().min(8).max(72),
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

#### auth.changePassword
**Priority:** Medium  
**Purpose:** Change password while logged in (requires current password)  
**Why Later:** Password reset covers most cases, this is security enhancement  
**Complexity:** Simple (password verification, update)

**Input:**
```typescript
{
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(72),
}
```

**Security Notes:**
- Requires current password verification
- Invalidates all other sessions (optional setting)
- Email notification sent about password change

---

### Growth Phase

#### auth.oauth.google
**Priority:** High  
**Purpose:** Sign in with Google OAuth  
**Why Later:** Email/password sufficient for MVP, OAuth increases conversion  
**Dependencies:** Google OAuth app credentials  
**Complexity:** Medium (OAuth flow, token exchange)

**Flow:**
1. Redirect to Google OAuth
2. User approves
3. Google redirects back with code
4. Exchange code for tokens
5. Create/login user

---

#### auth.oauth.github
**Priority:** Medium  
**Purpose:** Sign in with GitHub OAuth  
**Why Later:** Lower priority than Google for general users  
**Dependencies:** GitHub OAuth app  
**Complexity:** Medium (similar to Google)

---

#### auth.listSessions
**Priority:** Medium  
**Purpose:** List all active sessions for current user  
**Why Later:** Nice-to-have security feature, not essential  
**Complexity:** Simple (query sessions)

**Response:**
```typescript
{
  sessions: Array<{
    id: string;
    createdAt: DateTime;
    lastActivity: DateTime;
    ipAddress: string;
    userAgent: string;
    current: boolean; // Is this the current session?
  }>;
}
```

**Use Case:** User can see all devices logged in, revoke suspicious sessions

---

#### auth.revokeSession
**Priority:** Medium  
**Purpose:** Logout from specific session/device  
**Why Later:** Requires listSessions first  
**Complexity:** Simple (delete session)

**Input:**
```typescript
{
  sessionId: z.string(),
}
```

---

### Scale Phase

#### auth.twoFactor.enable
**Priority:** High (for enterprise)  
**Purpose:** Enable two-factor authentication (TOTP)  
**Why Later:** Enterprise security feature, not needed for MVP  
**Dependencies:** TOTP library (speakeasy)  
**Complexity:** Complex (QR code generation, backup codes)

**Response:**
```typescript
{
  secret: string; // TOTP secret
  qrCode: string; // Data URL for QR code
  backupCodes: string[]; // One-time backup codes
}
```

---

#### auth.twoFactor.verify
**Priority:** High (for enterprise)  
**Purpose:** Verify 2FA code during login  
**Why Later:** Requires twoFactor.enable first  
**Complexity:** Medium (TOTP verification)

**Input:**
```typescript
{
  code: z.string().length(6),
}
```

---

## 🔒 Security Best Practices

### Password Security
- **Minimum 8 characters, maximum 72** (bcrypt limit)
- **Hashed with bcrypt** (cost factor 10)
- **Never logged or exposed** in API responses
- **Rate limited:** 5 attempts per minute

### Session Security
- **HttpOnly cookies** (not accessible via JavaScript - XSS protection)
- **Secure flag** in production (HTTPS only)
- **SameSite=lax** (CSRF protection)
- **7-day expiration** (sliding window)
- **Cryptographically random tokens** (32 bytes)

### Email Security
- **Case-insensitive** comparison
- **Trimmed whitespace** automatically
- **Uniqueness enforced** at database level

### Rate Limiting
- **Signup:** 5 per minute per IP
- **Login:** 5 per minute per IP
- **Password reset:** 3 per hour per email

### Error Messages
- **Generic messages** for authentication failures
- **Don't reveal** if email exists
- **Constant-time** password comparison

---

## 🧪 Testing Scenarios

### MVP Testing
- [ ] Sign up with valid email/password
- [ ] Sign up with duplicate email (should fail)
- [ ] Sign up with invalid email format
- [ ] Sign up with password too short
- [ ] Sign in with correct credentials
- [ ] Sign in with wrong password
- [ ] Sign in with non-existent email
- [ ] Sign out successfully
- [ ] Get session while logged in
- [ ] Get session without login (should fail)
- [ ] Session persists across page reloads
- [ ] Session expires after 7 days

### Security Testing
- [ ] Password not visible in responses
- [ ] Session token is HttpOnly
- [ ] Rate limiting enforced
- [ ] CSRF protection active
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized

---

## 📚 Related Documentation

- [Users API](./02-users) - Profile management
- [Security Guidelines](../../.ruler/security_guidelines) - Security best practices

---

## 🔗 External Resources

- [Better-Auth Documentation](https://www.better-auth.com/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [bcrypt vs argon2](https://security.stackexchange.com/questions/193351/in-2018-what-is-the-recommended-hash-to-store-passwords-bcrypt-scrypt-argon2)
