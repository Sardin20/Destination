FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package.json ./
#COPY package-lock.json ./

# Clean npm cache (optional but helpful in fixing certain npm issues)
RUN npm cache clean --force

# Install dependencies with --legacy-peer-deps to bypass peer dependency conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the application files
COPY . .

# Start the application
CMD ["npm", "run", "dev"]
