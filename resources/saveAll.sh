#!/bin/bash

# Usage ./saveAll.sh DIRECTORY_PATH ELASTICSEARCH_URL


DIRECTORY=$1
ELASTICSEARCH_URL=$2

if [ "$#" -ne 2 ]; then
    echo "Illegal number of parameters"
    echo "Try ./saveAll.sh DIRECTORY_PATH ELASTICSEARCH_URL"
    exit 1
fi


if [ -d "$DIRECTORY" ]; then
  # exists ask user what to do
  while true; do
    read -p "Directory $DIRECTORY exists. Do you want to clear it first?" yn
    case $yn in
        [Yy]* ) rm -rf $DIRECTORY; break;;
        [Nn]* ) break;;
        * ) echo "Please answer yes or no.";;
    esac
  done
  mkdir -p $DIRECTORY
else
  mkdir -p $DIRECTORY
fi

./save.sh $DIRECTORY $ELASTICSEARCH_URL search
./save.sh $DIRECTORY $ELASTICSEARCH_URL dashboard
./save.sh $DIRECTORY $ELASTICSEARCH_URL query
./save.sh $DIRECTORY $ELASTICSEARCH_URL visualization
./save.sh $DIRECTORY $ELASTICSEARCH_URL template
