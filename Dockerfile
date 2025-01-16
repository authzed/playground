ARG BASE_IMAGE=node:22-alpine

FROM --platform=$BUILDPLATFORM $BASE_IMAGE AS playground-builder
WORKDIR /app
# Bring in everything not ignored by the dockerignore
COPY . .
ENV YARN_CACHE_FOLDER=/tmp/yarn_cache
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

COPY --from=playground-builder /app/dist/ /usr/share/nginx/html/

COPY examples/schemas/ /usr/share/nginx/html/static/schemas
RUN ls /usr/share/nginx/html/static/schemas > /usr/share/nginx/html/static/schemas/_all
