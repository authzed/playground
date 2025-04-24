#!/usr/bin/env sh
# TODO: do this with vite config or moving the folders
# instead of a script

mkdir -p public/static/schemas
cp -R examples/schemas/* public/static/schemas
ls public/static/schemas > public/static/schemas/_all
