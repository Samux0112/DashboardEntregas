# Build Stage
FROM node:current-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage 1
FROM node:current-alpine
WORKDIR /app
COPY --from=build /app .
EXPOSE 5173
CMD ["npm", "run", "dev"]