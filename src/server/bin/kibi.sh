#!/bin/sh
SCRIPT=$0

# SCRIPT may be an arbitrarily deep series of symlinks. Loop until we have the concrete path.
while [ -h "$SCRIPT" ] ; do
  ls=$(ls -ld "$SCRIPT")
  # Drop everything prior to ->
  link=$(expr "$ls" : '.*-> \(.*\)$')
  if expr "$link" : '/.*' > /dev/null; then
    SCRIPT="$link"
  else
    SCRIPT=$(dirname "$SCRIPT")/"$link"
  fi
done

DIR=$(dirname "${SCRIPT}")/..
NODE=${DIR}/node/bin/node
SERVER=${DIR}/src/bin/kibi.js

# create symlink only when load_jdbc: true
if grep  "^load_jdbc:\\s\{1,\}true\\s*$" ${DIR}/config/kibi.yml
then
  $DIR/bin/create_symlink.sh
fi

# add shipped node to the path as sync_request in fallback mode requires installed node
export PATH="$PATH:${DIR}/node/bin"

ROOT_DIR="$DIR/" CONFIG_PATH="${DIR}/config/kibi.yml" NODE_ENV="production" exec "${NODE}" ${SERVER} ${@}

