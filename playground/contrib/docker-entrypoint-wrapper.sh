#!/usr/bin/env bash

env_file=/usr/share/nginx/html/config-env.js
nginx_conf=/etc/nginx/nginx.conf
nginx_conf_template=nginx.conf.tmpl

. generate-config-env.sh

validate_env "$env_file"
generate_env "$env_file"
generate_nginx "$nginx_conf_template" "$nginx_conf"

/docker-entrypoint.sh nginx
