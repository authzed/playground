#!/usr/bin/env sh

set -e

VERSION=$(grep spicedb ./spicedb-common/wasm-config.json | sed -E  's/"spicedb":.*"(.*)".*/\1/' | xargs)
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
GOOS=js GOARCH=wasm go build -o main.wasm
mv main.wasm ../../../../wasm
