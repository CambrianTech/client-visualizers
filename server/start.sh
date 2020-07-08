#!/bin/bash
forever start -l forever.log -o forever.out -e forever.err ./server.js
nginx -g "daemon off;"