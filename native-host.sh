#!/bin/bash

cd "$(dirname "$(realpath "$0")")" || exit 1
exec node dist/cli/native-host.js
