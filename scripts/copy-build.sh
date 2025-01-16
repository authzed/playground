#!/usr/bin/env sh
# TODO: do this with vite config or moving the folders
# instead of a script

mkdir -p build/static/schemas
cp -R examples/schemas/* build/static/schemas
ls build/static/schemas > build/static/schemas/_all
