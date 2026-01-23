# 🔒 Production Security Guide

This document outlines the security measures implemented in the Smart Tender Dashboard and provides a checklist for production deployment.

## 📋 Security Architecture

### Defense in Depth Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Client Rate Limiter (lib/secure-api.js)            │    │
│  │  - Local request throttling                         │    │
│  │  - Retry with exponential backoff                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    EDGE MIDDLEWARE                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  middleware.js                                       │    │
│  │  - Global rate limiting per IP                       │    │
│  │  - Security headers injection                        │    │
│  │  - HSTS enforcement                                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API ROUTE HANDLER                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  app/api/chat/route.js                               │    │
│  │  - Security middleware (lib/security.js)             │    │
│  │  - Request validation & sanitization                 │    │
│  │  - Bot detection                                     │    │
│  │  - CORS protection                                   │    │
│  │  - Circuit breaker pattern                           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL API (Gemini)                       │
└─────────────────────────────────────────────────────────────┘
```

## 🛡️ DDoS Protection Features

### 1. Rate Limiting (Multiple Layers)

| Layer | Location | Limit | Window |
|-------|----------|-------|--------|
| Edge | middleware.js | 30 req/IP | 1 minute |
| API Route | lib/security.js | 30 req/IP | 1 minute |
| Client | lib/secure-api.js | 20 req | 1 minute |

### 2. Burst Detection
- **Burst Limit**: 10 requests in 5 seconds
- **Action**: Automatic IP block for 5 minutes
- **Purpose**: Stops sudden attack spikes

### 3. Circuit Breaker
- **Failure Threshold**: 5 consecutive failures
- **Reset Time**: 1 minute
- **States**: CLOSED → OPEN → HALF_OPEN → CLOSED

### 4. Request Queue
- **Max Queue Size**: 50 requests
- **Queue Timeout**: 30 seconds
- **Max Concurrent**: 3 requests

## 🔐 Security Headers

All responses include:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | nosniff | Prevent MIME sniffing |
| `X-Frame-Options` | DENY | Prevent clickjacking |
| `X-XSS-Protection` | 1; mode=block | XSS protection |
| `Referrer-Policy` | strict-origin-when-cross-origin | Limit referrer info |
| `Permissions-Policy` | camera=(), microphone=()... | Disable unused APIs |
| `Strict-Transport-Security` | max-age=31536000 | Force HTTPS |
| `Content-Security-Policy` | (see config) | Prevent XSS/injection |

## 📝 Production Deployment Checklist

### Pre-Deployment

- [ ] **Environment Variables**
  - [ ] Set `GEMINI_API_KEY` (server-side only, NOT `NEXT_PUBLIC_`)
  - [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
  - [ ] Set `NODE_ENV=production`

- [ ] **API Key Security**
  - [ ] Using server-side API key (not exposed to client)
  - [ ] Separate API keys for dev/staging/production
  - [ ] API key has appropriate usage limits in Google Cloud

- [ ] **Code Review**
  - [ ] No hardcoded secrets in codebase
  - [ ] No `console.log` statements with sensitive data
  - [ ] All user inputs are sanitized

### Infrastructure

- [ ] **HTTPS**
  - [ ] SSL/TLS certificate installed
  - [ ] HTTP-to-HTTPS redirect enabled
  - [ ] HSTS header enabled

- [ ] **CDN/WAF (Recommended)**
  - [ ] Cloudflare or similar CDN enabled
  - [ ] WAF rules configured
  - [ ] DDoS protection at edge

- [ ] **Monitoring**
  - [ ] Error tracking (e.g., Sentry)
  - [ ] Rate limit alerts configured
  - [ ] API usage monitoring

### Platform-Specific

#### Vercel Deployment
```bash
# Set environment variables
vercel env add GEMINI_API_KEY production
vercel env add NEXT_PUBLIC_APP_URL production

# Deploy
vercel --prod
```

#### Docker Deployment
```dockerfile
# Never include secrets in Dockerfile
# Pass via environment variables at runtime
docker run -e GEMINI_API_KEY=xxx your-image
```

## 🚨 Incident Response

### If Under DDoS Attack

1. **Monitor** the attack patterns in logs
2. **Enable** stricter rate limits if needed:
   ```javascript
   // In lib/security.js, reduce limits:
   RATE_LIMIT: {
       MAX_REQUESTS: 10,     // Reduce from 30
       BURST_LIMIT: 5,       // Reduce from 10
   }
   ```
3. **Block** attacking IPs via CDN/WAF
4. **Scale** infrastructure if using serverless

### Manual IP Blocking

```javascript
import { blockIPManually, unblockIPManually } from '@/lib/security'

// Block an IP
blockIPManually('1.2.3.4')

// Unblock an IP
unblockIPManually('1.2.3.4')
```

## 📊 Monitoring API Status

```javascript
import { getSecurityStats } from '@/lib/security'
import { getClientAPIStatus } from '@/lib/secure-api'

// Server-side stats
const serverStats = getSecurityStats()
console.log(serverStats)
// { activeIPs: 12, blockedIPs: 2, blockedList: ['1.2.3.4', '5.6.7.8'] }

// Client-side stats
const clientStats = getClientAPIStatus()
console.log(clientStats)
// { canRequest: true, requestsInWindow: 5, maxRequests: 20 }
```

## 🔄 Migration Guide

### Updating Existing API Calls

Replace old imports:
```javascript
// OLD (insecure - exposes API key)
import { callGeminiApi } from '@/lib/api'

// NEW (secure - uses server API route)
import { callSecureAPI } from '@/lib/secure-api'
```

The function signature is compatible - just replace the import.

## ⚠️ Security Limitations

1. **In-Memory Rate Limiting**: Current implementation uses in-memory storage. For multi-instance deployments, use Redis.

2. **IP Spoofing**: Ensure your CDN/proxy correctly forwards `X-Forwarded-For` headers.

3. **Edge Limitations**: Edge middleware has limited state persistence. Critical rate limiting happens in API routes.

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/pages/building-your-application/configuring/security-headers)
- [Cloudflare DDoS Protection](https://www.cloudflare.com/ddos/)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)

---

*Last Updated: January 2026*
