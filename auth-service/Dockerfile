FROM node:18

# Create app directory
WORKDIR /app

# Copy package files first (for better Docker caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create models directory if it doesn't exist
RUN mkdir -p models routes

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]
