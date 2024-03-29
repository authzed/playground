#!/usr/bin/env sh

. generate-config-env.sh

env_file=test-config-env.js

generate_env $env_file

if [ ! -f ${env_file} ]
then
    echo "${env_file} does not exist"
    exit 1
fi

npx jshint "${env_file}"
