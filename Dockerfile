ARG BASE_IMAGE=node:18-alpine3.18

FROM --platform=$BUILDPLATFORM $BASE_IMAGE AS playground-builder
WORKDIR /app
COPY ./package.json .
COPY ./yarn.lock .
COPY ./playground-ui ./playground-ui
COPY ./spicedb-common ./spicedb-common
COPY ./playground/package.json ./playground/package.json
ENV YARN_CACHE_FOLDER=/tmp/yarn_cache
RUN yarn install --frozen-lockfile --production --non-interactive --network-timeout 1000000

COPY ./playground ./playground

WORKDIR /app/playground

ARG APPLICATION_ROOT=/
ARG NODE_OPTIONS=--openssl-legacy-provider
ENV PUBLIC_URL ${APPLICATION_ROOT}
RUN yarn build

FROM $BASE_IMAGE AS playground-verifier
RUN npm install -g jshint
COPY ./playground/contrib/generate-config-env.sh .
COPY ./playground/contrib/test-config-env.sh .
RUN ./test-config-env.sh
RUN echo 'Config Verified' > verified

FROM nginx:1.25.2
LABEL maintainer="AuthZed <support@authzed.com>"
EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint-wrapper.sh"]
CMD []

COPY ./playground/contrib/generate-config-env.sh .
COPY ./playground/contrib/test-nginx-conf.sh .
COPY ./playground/contrib/test-config-env.sh .
COPY ./playground/contrib/nginx.conf.tmpl .
COPY ./playground/contrib/docker-entrypoint-wrapper.sh .
RUN bash ./test-nginx-conf.sh

COPY --from=playground-verifier verified .
COPY --from=playground-builder /app/playground/build/ /usr/share/nginx/html/
COPY wasm/main.wasm  /usr/share/nginx/html/static/main.wasm
COPY wasm/zed.wasm  /usr/share/nginx/html/static/zed.wasm

RUN mkdir /usr/share/nginx/html/static/schemas
COPY examples/schemas/ /usr/share/nginx/html/static/schemas
RUN ls /usr/share/nginx/html/static/schemas > /usr/share/nginx/html/static/schemas/_all
