## The Dev API

The share logic in prod is taken care of by Vercel API routes
that write and read to object storage. This provides a similar
API, but stores the shares in-memory. It exists to make it possible
to test share logic in development.
