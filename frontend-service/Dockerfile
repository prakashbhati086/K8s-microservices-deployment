# frontend-service/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

# Expose port used by frontend
EXPOSE 4000

CMD ["node", "app.js"]
