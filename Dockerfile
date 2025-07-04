ARG BASE_IMAGE=node:22-alpine

FROM --platform=$BUILDPLATFORM $BASE_IMAGE AS playground-builder
WORKDIR /app
# Bring in everything not ignored by the dockerignore
COPY . .
ENV YARN_CACHE_FOLDER=/tmp/yarn_cache

# Environment variables for build time.
ARG VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID=""

ARG VITE_DISCORD_CHANNEL_ID=""
ARG VITE_DISCORD_INVITE_URL="https://authzed.com/discord"
ARG VITE_DISCORD_SERVER_ID=""

RUN yarn install --frozen-lockfile --non-interactive --network-timeout 1000000

RUN yarn build

FROM $BASE_IMAGE AS playground-verifier

FROM nginx:1.25.2
LABEL maintainer="AuthZed <support@authzed.com>"
EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint-wrapper.sh"]
CMD []

COPY ./contrib/generate-config-env.sh .
COPY ./contrib/test-nginx-conf.sh .
COPY ./contrib/test-config-env.sh .
COPY ./contrib/nginx.conf.tmpl .
COPY ./contrib/docker-entrypoint-wrapper.sh .
RUN bash ./test-nginx-conf.sh

COPY --from=playground-builder /app/build/ /usr/share/nginx/html/
