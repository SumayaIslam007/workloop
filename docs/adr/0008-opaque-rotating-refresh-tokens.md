# 0008. Opaque, rotating refresh tokens in an httpOnly cookie

**Status:** Accepted

## Context

The API needs sessions that survive a page reload without leaving long-lived credentials where a cross-site scripting bug could read them. Storing a JWT in `localStorage` is the common shortcut, but any script on the page can read it, and a leaked JWT stays valid until it expires because nothing can revoke it.

## Decision

- **Access token:** a short-lived (15 minute) JWT returned in the response body. Clients keep it in memory only.
- **Refresh token:** 48 random bytes, not a JWT, set as an httpOnly, SameSite=Strict cookie scoped to `/auth`. Only a SHA-256 hash is stored in the database.
- **Rotation:** every refresh revokes the old token and issues a new one. Presenting an already-rotated token is treated as theft, and all of that user's sessions are revoked.

## Consequences

- Page scripts cannot read the refresh token, and the access token disappears when the tab closes.
- Sessions can be revoked, unlike a plain JWT-only design; a stolen token is usable for at most one refresh before the theft is detected.
- A fast hash is right for the stored token (unlike passwords, which use argon2) because 384 random bits cannot be brute-forced from a leaked hash.
- **Cost:** a database read and write on every refresh, a `refresh_tokens` table to clean up, and the web app must send credentials with the refresh call. Revoked rows need periodic pruning.
