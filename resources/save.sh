#!/bin/bash

# saves objects from kibana index
# usage:
# ./save.sh DIRECTORY_PATH ELASTICSEARCH_URL search|dashboard|visualization|query|template

FOLDER=$1
ELASTICSEARCH_URL=$2
OBJECT_NAME=$3

if [ "$#" -ne 3 ]; then
    echo "Illegal number of parameters"
    echo "Try ./save.sh DIRECTORY_PATH ELASTICSEARCH_URL search|dashboard|visualization|query|template"
    exit 1
fi

DIRECTORY="$FOLDER/$OBJECT_NAME"


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

curl -s  "$ELASTICSEARCH_URL/.kibi/$OBJECT_NAME/_search?size=100&pretty" | \
grep "[^st]_id" | \
sed -E 's/.*"_id" : "(.*)",/\1/' | \
while read -r id; do curl -s  "$ELASTICSEARCH_URL/.kibi/$OBJECT_NAME/$id/_source" | python -m json.tool > $DIRECTORY/$id.json; done
