#!/usr/bin/env sh

get_env_or_empty() {
    local var_name="$1"
    local var_value="${!var_name}"
    echo "${var_value:-}"
}

cp wasm/*.wasm  playground/build/static
mkdir -p playground/build/static/schemas
cp -R examples/schemas/* playground/build/static/schemas
ls playground/build/static/schemas > playground/build/static/schemas/_all

mkdir -p build
cp -R playground/build/* build

HEADER_VAL=$(get_env_or_empty "HEADER_CONTENT_SECURITY_POLICY")

# Note: Using platform independent hack for in-place edit
sed -i.bak -e "s/\$HEADER_CONTENT_SECURITY_POLICY/$HEADER_VAL/g" vercel.json
