FROM node:26-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
# Unprivileged user provided by the node image
USER node
EXPOSE 8005
CMD ["npm", "start"]
