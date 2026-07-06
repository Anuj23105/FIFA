# Production image for PitchPal. Works on Cloud Run, Fly.io, Railway, etc.
FROM node:22-alpine

# Create app directory owned by the non-root node user.
WORKDIR /app

# Install production dependencies only, using the lockfile for reproducibility.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source.
COPY src ./src
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run as the built-in unprivileged user.
USER node

CMD ["node", "src/server.js"]
