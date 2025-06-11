#!/usr/bin/env sh

set -e

VERSION=$(jq -r '.zed' ./src/wasm-config.json)
if [ -z ${VERSION} ] ; then
    echo "zed version not defined in wasm config" >&2
    exit 1
fi
echo "Updating zed wasm to version: ${VERSION}"

if [ ! -d "zed" ] ; then
    git clone https://github.com/authzed/zed.git
fi
cd zed
git fetch
git checkout ${VERSION}
cd pkg/wasm
# -s: Omit the symbol table.
# -w: Omit the DWARF debugging information.
GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o zed.wasm
mv zed.wasm ../../../public/static
