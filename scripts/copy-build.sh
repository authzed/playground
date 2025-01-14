#!/usr/bin/env sh
# TODO: do this with vite config or moving the folders
# instead of a script

cp wasm/*.wasm  dist/static
mkdir -p dist/static/schemas
cp -R examples/schemas/* dist/static/schemas
ls build/static/schemas > dist/static/schemas/_all
