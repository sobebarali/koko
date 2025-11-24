---
title: Permissions API
description: Fine-grained access control and sharing - Post-Launch Feature
---

# 🔐 Permissions API

## Overview

Advanced permission system for controlling access to projects, videos, and resources. Enables public/private sharing, link-based access, and granular role management.

**Status:** 🔄 Post-Launch (Month 1-2)

---

## Planned Endpoints

- `permission.grant` - Grant permission to user
- `permission.revoke` - Revoke permission
- `permission.getAll` - List resource permissions
- `permission.createShareLink` - Create public share link
- `permission.getShareLink` - Get share link details
- `permission.updateShareLink` - Update link settings
- `permission.deleteShareLink` - Delete share link
- `permission.checkAccess` - Check if user has access

**Full documentation will be added in Post-Launch phase.**

---

## Permission Levels

### Project Permissions
- `OWNER` - Full control
- `EDITOR` - Edit project and videos
- `REVIEWER` - View and comment
- `VIEWER` - View only

### Share Link Types
- `PUBLIC` - Anyone with link can view
- `PASSWORD` - Requires password
- `EMAIL_REQUIRED` - Requires email verification
- `EXPIRING` - Link expires after date/time

---

## Related Documentation

- [Projects API](./03-projects)
- [Videos API](./04-videos)
- [Teams API](./08-teams)
