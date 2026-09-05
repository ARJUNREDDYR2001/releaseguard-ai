FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src

EXPOSE 4050
CMD ["npm", "start"]
