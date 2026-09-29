# Lightweight alpine Deno container
FROM denoland/deno:alpine-2.1.4

WORKDIR /app

# Prefer production mode
ENV DENO_ENV=production
ENV PORT=8000

# Cache package dependencies
COPY deno.json deno.lock package.json ./
RUN deno cache --lock=deno.lock deno.json

# Copy application source and assets
COPY . .

# Build frontend production bundle for full standalone serving
RUN deno task build

EXPOSE 8000

# Run standalone HTTP server
CMD ["run", "-A", "server.ts"]
