FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
USER 1001:1001  # Use numeric instead of 'node'
EXPOSE 3000
CMD ["node","app.js"]
