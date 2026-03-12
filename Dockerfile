FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/

ENV MCP_MODE=http
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/index.js"]
