FROM node:22
WORKDIR /app

COPY package*.json ./
RUN apt-get update && apt-get install -y git \
    && curl -fsSL https://get.docker.com -o get-docker.sh \
    && sh get-docker.sh \
    && rm get-docker.sh
RUN npm install
RUN npm rebuild sqlite3 --build-from-source

COPY . .
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]
