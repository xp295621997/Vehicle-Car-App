FROM node:20-slim

RUN apt-get update && apt-get install -y curl ffmpeg && rm -rf /var/lib/apt/lists/*
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
