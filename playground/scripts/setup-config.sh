#!/usr/bin/env sh

DIR="$(dirname "$0")"
cd "$DIR/../contrib"

env_file="../build/config-env.js"

. generate-config-env.sh
validate_env "$env_file"
generate_env "$env_file"
