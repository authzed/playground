#!/usr/bin/env sh

. generate-config-env.sh

nginx_conf=/etc/nginx/nginx.conf.test
nginx_conf_template=nginx.conf.tmpl

generate_nginx "$nginx_conf_template" "$nginx_conf"

nginx -c "$nginx_conf" -t
