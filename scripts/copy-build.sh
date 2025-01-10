#!/usr/bin/env sh

cp wasm/*.wasm  build/static
mkdir -p build/static/schemas
cp -R examples/schemas/* build/static/schemas
ls build/static/schemas > build/static/schemas/_all
