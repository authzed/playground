#!/usr/bin/env sh

cp wasm/*.wasm  playground/build/static
mkdir -p playground/build/static/schemas
cp -R examples/schemas/* playground/build/static/schemas
ls playground/build/static/schemas > playground/build/static/schemas/_all

mkdir -p build
cp -R playground/build/* build
