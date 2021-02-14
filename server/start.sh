#!/bin/bash
forever start -l forever.log -o forever.out -e forever.err dist/index.js
nginx -g "daemon off;"