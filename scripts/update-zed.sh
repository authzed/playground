#!/usr/bin/env sh

set -e
if [ ! -d "zed" ] ; then
    git clone https://github.com/authzed/zed.git
fi
cd zed
git checkout e4815f1475e320c0b008f7d016db59ee158a965c
cd pkg/wasm
GOOS=js GOARCH=wasm go build -o zed.wasm
mv zed.wasm ../../../wasm
