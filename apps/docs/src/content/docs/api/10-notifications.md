---
title: Notifications API
description: Real-time notifications and activity feed - Post-Launch Feature
---

# 🔔 Notifications API

## Overview

Real-time notification system for keeping users informed about comments, mentions, project updates, and processing status.

**Status:** 🔄 Post-Launch (Month 1-2)

---

## Planned Endpoints

- `notification.getAll` - Get user notifications
- `notification.markAsRead` - Mark notification as read
- `notification.markAllAsRead` - Mark all as read
- `notification.delete` - Delete notification
- `notification.updatePreferences` - Update notification settings
- `notification.getPreferences` - Get notification preferences
- `notification.subscribe` - Subscribe to WebSocket updates

**Full documentation will be added in Post-Launch phase.**

---

## Notification Types

- `COMMENT_CREATED` - New comment on your video
- `COMMENT_REPLY` - Reply to your comment
- `MENTION` - You were mentioned
- `VIDEO_READY` - Video processing complete
- `VIDEO_FAILED` - Video processing failed
- `PROJECT_INVITE` - Added to project
- `PERMISSION_CHANGED` - Your permission changed

---

## Delivery Channels

- **In-app** - Real-time WebSocket notifications
- **Email** - Configurable email notifications
- **Browser** - Push notifications (future)
- **Slack** - Webhook integration (future)

---

## Related Documentation

- [Comments API](./05-comments)
- [Videos API](./04-videos)
- [Webhooks API](./12-webhooks)
