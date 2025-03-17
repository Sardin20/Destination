# Use a lightweight Node.js image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the entire project
COPY . .

# Install MongoDB client tools for importing data
RUN apk add --no-cache mongodb-tools

# Copy sample data JSON file into the container
COPY data/sample_posts.json /app/data/sample_posts.json

# Expose the application's port
# EXPOSE 8080

# Ensure MongoDB is running before starting Node.js and import data
CMD mongoimport --host mongodb --db wanderlust --collection posts --file /app/data/sample_posts.json --jsonArray --mode=upsert && node server.js
