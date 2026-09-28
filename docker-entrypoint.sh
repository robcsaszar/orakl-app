#!/bin/sh
# Derive ORIGIN from FLY_APP_NAME when not explicitly set.
# Covers PR review apps (pr-NNN-robcsaszar-orakl.fly.dev) without workflow changes.
if [ -z "$ORIGIN" ] && [ -n "$FLY_APP_NAME" ]; then
  export ORIGIN="https://${FLY_APP_NAME}.fly.dev"
fi

exec node ./server-entry.mjs
