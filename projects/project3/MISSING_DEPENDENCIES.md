# 🚨 MISSING DEPENDENCIES - Install Before Implementation

## Current Status
Only basic Next.js dependencies are installed. All feature-specific dependencies are MISSING.

## Required Dependencies by Feature

### 🗄️ Database (TASK-P3-DB-001)
```bash
npm install pg @types/pg drizzle-orm drizzle-kit
```

### 🔐 Authentication (TASK-P3-DB-002)
```bash
npm install bcryptjs @types/bcryptjs jsonwebtoken @types/jsonwebtoken
```

### 🤖 AI Predictions (TASK-P3-003/004)
```bash
npm install @anthropic-ai/sdk
```

### ✅ API Validation (TASK-P3-005)
```bash
npm install zod
```

### 📊 Charts (CRYPTO-UI-004)
```bash
npm install recharts
```

### 🎨 UI Components (CRYPTO-UI-*)
```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-switch @radix-ui/react-toast class-variance-authority tailwind-merge lucide-react clsx
```

### 🔄 Caching (Optional but recommended)
```bash
npm install @upstash/redis
```

### 📅 Date utilities
```bash
npm install date-fns
```

## 🚀 One Command to Install All
```bash
npm install @anthropic-ai/sdk pg @types/pg drizzle-orm drizzle-kit bcryptjs @types/bcryptjs jsonwebtoken @types/jsonwebtoken zod recharts @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-switch @radix-ui/react-toast class-variance-authority tailwind-merge lucide-react date-fns clsx @upstash/redis
```

## ⚠️ IMPORTANT
You CANNOT implement the features without these dependencies. The tests expect these libraries to exist. Install them FIRST before starting any implementation work.