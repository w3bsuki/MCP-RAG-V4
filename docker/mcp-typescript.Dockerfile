FROM node:18-alpine

WORKDIR /app

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY mcp-servers/typescript/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript configuration and source
COPY mcp-servers/typescript/tsconfig.json ./
COPY mcp-servers/typescript/src/ ./src/

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p /app/shared /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Expose port
EXPOSE 3000

# Run the server
CMD ["node", "dist/index.js"]