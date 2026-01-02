FROM oven/bun AS builder
WORKDIR /app
COPY package.json bun.lock ./
ENV LEFTHOOK=0
RUN bun i --ignore-scripts
COPY . .
RUN bun run build

FROM oven/bun:1.3.5-alpine AS ffmpeg
WORKDIR /app
RUN apk add --no-cache ffmpeg && mkdir images && mkdir images-output
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/src/watermark/photo-mark.png /app/src/watermark/photo-mark.png

CMD [ "bun", "dist/index.js" ]
