#!/usr/bin/env sh
# TODO: do this with vite config or moving the folders
# instead of a script

mkdir -p dist/static/schemas
cp -R examples/schemas/* dist/static/schemas
ls dist/static/schemas > dist/static/schemas/_all
