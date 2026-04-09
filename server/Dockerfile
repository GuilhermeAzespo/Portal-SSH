FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
# We need to compile TS to JS if we had a build step, but since we are using ts-node-dev for dev, 
# for production we should compile or use ts-node. Let's install typescript and build.
RUN npm install -g typescript
RUN tsc || true

EXPOSE 4000
CMD ["npm", "run", "dev"]
