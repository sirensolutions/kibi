for file in ./*.asciidoc; do
  [ -e "$file" ] || continue
  echo "include::sentinl/${file##*/}[]" >> ../sentinl.asciidoc
  echo "" >> ../sentinl.asciidoc
done