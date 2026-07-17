FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies required for Prisma and pdf parsing
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema first to install prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start script that runs migrations then starts server
CMD ["sh", "-c", "npx prisma db push && npm start"]
