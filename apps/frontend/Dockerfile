FROM node:22-slim AS build

WORKDIR /app
ARG VITE_API_BASE_URL=

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

COPY packages/shared packages/shared
COPY apps/frontend apps/frontend
RUN npm run build --workspace @ace/shared \
  && npm run build --workspace @ace/frontend

FROM nginx:1.27-alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
