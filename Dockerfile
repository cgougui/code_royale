# ---- Build the static single-page app ----
FROM node:22-alpine AS build
WORKDIR /app
# Workspace manifests first, so dependency installs are cached across code changes.
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/content/package.json packages/content/
COPY packages/renderer/package.json packages/renderer/
RUN npm ci
COPY . .
# Refuse to ship if the engine, the architecture rules or the golden replays are broken.
RUN npm run check && npm run build

# ---- Serve it with nginx ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/client /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ >/dev/null || exit 1
