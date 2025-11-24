---
title: Webhooks API
description: Event-driven integrations and automation - Scale Phase Feature
---

# 🔗 Webhooks API

## Overview

Webhooks enable real-time integrations with external services by sending HTTP callbacks when events occur in Koko.

**Status:** ⚡ Scale Phase (Month 6+)

---

## Planned Endpoints

- `webhook.create` - Create webhook endpoint
- `webhook.getById` - Get webhook details
- `webhook.getAll` - List all webhooks
- `webhook.update` - Update webhook settings
- `webhook.delete` - Delete webhook
- `webhook.test` - Send test payload
- `webhook.getDeliveries` - Get delivery history
- `webhook.redeliver` - Retry failed delivery

**Full documentation will be added in Scale phase.**

---

## Webhook Events

### Video Events
- `video.uploaded` - Video upload complete
- `video.processing` - Processing started
- `video.ready` - Video ready for playback
- `video.failed` - Processing failed
- `video.deleted` - Video deleted

### Comment Events
- `comment.created` - New comment
- `comment.updated` - Comment edited
- `comment.deleted` - Comment deleted
- `comment.resolved` - Comment resolved

### Project Events
- `project.created` - New project
- `project.updated` - Project settings changed
- `project.deleted` - Project deleted

### User Events
- `user.invited` - User invited to project
- `user.removed` - User removed from project
- `permission.changed` - Permission updated

---

## Payload Format

```json
{
  "event": "video.ready",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "videoId": "video_123",
    "projectId": "proj_456",
    "status": "READY",
    "duration": 120.5
  }
}
```

---

## Security Features

- **Signature verification** - HMAC-SHA256 signatures
- **IP whitelisting** - Restrict source IPs
- **Secret rotation** - Rotate webhook secrets
- **Retry logic** - Automatic retry on failure
- **Rate limiting** - Prevent abuse

---

## Integration Examples

- Slack notifications
- Email automation
- CI/CD pipelines
- Analytics tracking
- Custom workflows

---

## Related Documentation

- [Videos API](./04-videos)
- [Comments API](./05-comments)
- [Notifications API](./10-notifications)
