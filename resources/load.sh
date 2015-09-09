#!/bin/bash

# load objects into kibana index
# usage:
# ./load.sh FOLDER_PATH ELASTICSEARCH_URL search|dashboard|visualization|query|template

FOLDER=$1
ELASTICSEARCH_URL=$2
OBJECT_NAME=$3

for file in $FOLDER/$OBJECT_NAME/*.json
do
  
  filename=$(basename $file)
  id=$(basename $filename .json) 
  echo "loading $filename id $id"
  curl  -X PUT "$ELASTICSEARCH_URL/.kibi/$OBJECT_NAME/$id" -T $FOLDER/$OBJECT_NAME/$filename --silent
done
