FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY vendor/classic-rig-runtime ./vendor/classic-rig-runtime
RUN npm install --prefix vendor/classic-rig-runtime
RUN npm run build --prefix vendor/classic-rig-runtime
RUN npm install
RUN rm -rf node_modules/@rigintel/classic-rig-runtime \
  && mkdir -p node_modules/@rigintel/classic-rig-runtime \
  && cp -R vendor/classic-rig-runtime/. node_modules/@rigintel/classic-rig-runtime/

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]