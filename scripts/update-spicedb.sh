#!/usr/bin/env sh

set -e
if [ ! -d "spicedb" ] ; then
  git clone https://github.com/authzed/spicedb.git
fi
cd spicedb
git checkout 3b37d794c689d635f62d94b868abe3cb66e109f0
cd pkg/development/wasm
GOOS=js GOARCH=wasm go build -o main.wasm
mv main.wasm ../../../../wasm
