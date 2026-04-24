# Deploy Skill

Trigger deployments to Vercel, Docker, or other platforms.

## Vercel Deployment

### Connect Repository

1. Go to vercel.com
2. Import GitHub repository
3. Configure build settings

### Environment Variables

```
VERCEL_TOKEN=your-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

### Deploy Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel --prod

# Deploy to preview (preview URL)
vercel

# List deployments
vercel list
```

## Docker Deployment

### Build Image

```bash
docker build -t horizonview:latest .
```

### Run Container

```bash
docker run -p 3000:3000 horizonview:latest
```

### Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

## GitHub Actions Deploy

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Deployment Checklist

- [ ] Build succeeds locally (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] Health endpoint verified
