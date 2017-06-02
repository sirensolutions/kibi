#!/bin/bash

# Use to create html documentation zip
# Usage:
# ./create_doc_zip.sh 4.5.3-1 true/false

VERSION=$1
EE_ENABLED=$2
SUFFIX=-documentation
if [ "$EE_ENABLED" == "true" ]; then
  SUFFIX=-ee-documentation
fi
FOLDER=kibi-$VERSION$SUFFIX

if [[ "$OSTYPE" == "darwin"* ]]; then
  asciidoctor -d book index.asciidoc
else
  asciidoc -d book index.asciidoc
fi
mkdir $FOLDER
cp -R images index.html $FOLDER
zip -rq $FOLDER.zip $FOLDER
rm -rf $FOLDER
