#!/usr/bin/env sh

DIR=$(dirname "$0")
echo "setup-config directory: $DIR"
cd "$DIR/../contrib"

env_file="../build/config-env.js"
echo "contrib directory: $(pwd)"
echo "contrib: $(ls)"

. ./generate-config-env.sh
validate_env "$env_file"
generate_env "$env_file"
