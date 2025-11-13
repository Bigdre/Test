# Multi-stage build for MCP SSH Server
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install OpenSSH client for SSH key support
RUN apk add --no-cache openssh-client

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create directory for SSH keys
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh

# Set environment variables
ENV NODE_ENV=production

# The MCP server communicates via stdio, so we don't expose ports
# But we document the typical SSH port for reference
# EXPOSE 22 (this is the remote SSH server port, not used by this container)

# Set the entrypoint to run the MCP server
ENTRYPOINT ["node", "/app/dist/index.js"]

# Add labels
LABEL maintainer="MCP SSH Server"
LABEL description="Model Context Protocol server for SSH operations"
LABEL version="1.0.0"
