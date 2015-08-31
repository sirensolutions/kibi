#!/bin/bash

# Usage ./loadAll.sh FOLDER_PATH ELASTICSEARCH_URL


FOLDER=$1
ELASTICSEARCH_URL=$2

./load.sh $FOLDER $ELASTICSEARCH_URL search
./load.sh $FOLDER $ELASTICSEARCH_URL dashboard
./load.sh $FOLDER $ELASTICSEARCH_URL query
./load.sh $FOLDER $ELASTICSEARCH_URL visualization
./load.sh $FOLDER $ELASTICSEARCH_URL template
