### Building documentation from .asciidoc files

Install [asciidoctor](http://asciidoctor.org/#installation)

In the `/docs` folder, run the following in a terminal

```
asciidoctor -a enterprise_enabled=true -d book index.asciidoc
```

NOTE: error/warning messages that refer to `invalid part, must have at least one section (e.g., chapter, appendix, etc.)` can safely be ignored.

For more configuration options, see [CLI Options](http://asciidoctor.org/docs/user-manual/#cli-options)

The documentation is built and converted to (styled) html format in `index.html`.

The html file can be opened in any browser by copying the full file path and pasting into the searchbar.
