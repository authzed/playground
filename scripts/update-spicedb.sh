#!/usr/bin/env sh

set -e

VERSION=$(jq -r '.spicedb' ./src/wasm-config.json)
if [ -z ${VERSION} ] ; then
    echo "SpiceDB version not defined in wasm config" >&2
    exit 1
fi
echo "Updating SpiceDB wasm to version: ${VERSION}"


if [ ! -d "spicedb" ] ; then
  git clone https://github.com/authzed/spicedb.git
fi
cd spicedb
git fetch
git checkout ${VERSION}
cd pkg/development/wasm
# -s: Omit the symbol table.
# -w: Omit the DWARF debugging information.
GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o main.wasm
mv main.wasm ../../../../public/static
