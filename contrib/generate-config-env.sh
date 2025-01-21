#!/usr/bin/env bash

generate_nginx() {
    conf_template=$1
    nginx_conf=$2
    envsubst '$PLAYGROUND_DEVELOPER_API_DOWNLOAD_ENDPOINT,$HEADER_CONTENT_SECURITY_POLICY' < "$conf_template" > "$nginx_conf"
    echo "${nginx_conf}:"
    cat "$nginx_conf"
}
