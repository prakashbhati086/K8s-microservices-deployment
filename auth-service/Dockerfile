# auth-service/Dockerfile
FROM node:18

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["node", "app.js"]
