# Lightweight base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the app (includes routes/, models/, app.js, etc.)
COPY . .

# Use non-root user for security
USER node

# Expose the port your app listens on
EXPOSE 3000

# Start the app
CMD ["node", "app.js"]
