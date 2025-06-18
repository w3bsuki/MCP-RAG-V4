# 🚀 QUICK VERCEL DEPLOYMENT (5 Minutes Total)

## Deploy Both Frontend + Backend to Vercel

### 1. Deploy Frontend (2 minutes)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import GitHub repo: `w3bsuki/MCP-RAG-V4`
3. **Project Settings:**
   ```
   Framework: Vite
   Root Directory: projects/project1/src/frontend
   Build Command: npm run build
   Output Directory: dist
   ```
4. Click "Deploy"
5. **Copy your frontend URL** (like `https://dashboard-abc123.vercel.app`)

### 2. Deploy Backend (3 minutes)

1. Go to [vercel.com/new](https://vercel.com/new) again
2. Import **same repo**: `w3bsuki/MCP-RAG-V4`
3. **Project Settings:**
   ```
   Framework: Other
   Root Directory: projects/project1/src/backend
   Build Command: npm install
   Output Directory: (leave empty)
   ```
4. **Environment Variables:**
   ```
   NODE_ENV=production
   CORS_ORIGIN=https://dashboard-abc123.vercel.app
   ```
   *(Replace with your actual frontend URL from step 1)*

5. Click "Deploy"
6. **Copy your backend URL** (like `https://backend-xyz789.vercel.app`)

### 3. Connect Frontend to Backend (1 minute)

1. Go back to your **frontend project** in Vercel
2. Settings → Environment Variables
3. Add:
   ```
   VITE_API_URL=https://backend-xyz789.vercel.app
   ```
   *(Replace with your actual backend URL from step 2)*

4. Redeploy frontend (it will auto-redeploy)

## ✅ DONE! 

Your live dashboard will be at: `https://dashboard-abc123.vercel.app`

### What Works:
- ✅ Dashboard UI
- ✅ API endpoints  
- ✅ Health check at `/health`
- ✅ Chat interface (basic)
- ⚠️ File monitoring (limited in serverless)
- ⚠️ WebSockets (not supported in Vercel serverless)

### Test It:
- Visit your dashboard URL
- Check `https://your-backend.vercel.app/health`
- Try the chat interface

**Perfect for monitoring while agents work on ServiceBot!** 🎯

## Note:
This is a quick serverless deployment. For full functionality (WebSockets, file monitoring), use Railway/Render later.