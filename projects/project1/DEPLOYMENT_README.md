# Agent Monitoring Dashboard - Vercel Deployment

## Quick Deploy to Vercel

### Option 1: Deploy from GitHub (Recommended)

1. **Go to [Vercel Dashboard](https://vercel.com/new)**

2. **Import your GitHub repository:**
   - Connect GitHub account if needed
   - Select repository: `w3bsuki/MCP-RAG-V4`

3. **Configure deployment settings:**
   ```
   Framework Preset: Vite
   Root Directory: projects/project1/src/frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Environment Variables (Optional):**
   ```
   VITE_API_URL=https://your-backend-url.com
   ```

5. **Deploy!** - Vercel will build and deploy automatically

### Option 2: Manual Deploy

```bash
# From the frontend directory
cd projects/project1/src/frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Backend Deployment (Separate)

The backend needs to be deployed separately. Options:

### Railway (Recommended for Node.js)
1. Go to [Railway](https://railway.app)
2. Connect GitHub repo
3. Set root directory to: `projects/project1/src/backend`
4. Configure environment variables

### Render
1. Go to [Render](https://render.com)
2. Connect GitHub repo
3. Create new Web Service
4. Set root directory to: `projects/project1/src/backend`
5. Build command: `npm install && npm run build`
6. Start command: `npm start`

## Environment Variables Needed

### Frontend (.env)
```
VITE_API_URL=https://your-backend-url.com
```

### Backend (.env)
```
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

## Post-Deployment Setup

1. **Update API URL**: After backend deployment, update frontend's API URL
2. **Configure CORS**: Update backend CORS to allow your Vercel domain
3. **Test all features**: Verify monitoring, chat, and API endpoints work

## Monitoring URLs

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.railway.app`
- **Health Check**: `https://your-backend.railway.app/health`

## GitHub Auto-Deploy

Once connected to Vercel:
- Every push to `main` branch auto-deploys
- Pull request previews available
- View deployment logs in Vercel dashboard