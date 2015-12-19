# Kibi 0.2.0

Kibi extends Kibana 4.1 with data intelligence features; the core feature of
Kibi is the capability to join and filter data from multiple Elasticsearch
indexes and from SQL/NOSQL data sources ("external queries").

In addition, Kibi provides UI features and visualizations like dashboard
groups, tabs, cross entity relational navigation buttons, an enhanced search
results table, analytical aggregators, HTML templates on query results, and
much more.

## Quick start

* Download the Kibi demo distribution: [http://siren.solutions/kibi](http://siren.solutions/kibi)
* Start Elasticsearch by running `elasticsearch\bin\elasticsearch` on Linux/OS X or `elasticsearch\bin\elasticsearch.bat` on Windows.
* Go to the `kibi` directory and run `bin/kibi` on Linux/OS X or `bin\kibi.bat` on Windows.

A pre-configured Kibi is now running at [http://localhost:5602](http://localhost:5602);
a complete description of the demo is [available](http://siren.solutions/kibi/docs/current/getting-started.html) in the Kibi documentation.

## Documentation

Visit [siren.solutions](http://siren.solutions/kibi/docs) for the full Kibi
documentation.

## License

Copyright (c) 2015 SIREn Solutions

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this software except in compliance with the License. You may obtain a copy of
the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.

To enable index join capabilities, Kibi relies on the the Siren 2
Elasticsearch plugin. The Kibi demo distribution includes a pre release of
Siren 2 that is licensed exclusively for personal use, development and
accredited academic research. For a production license of Siren 2 please
contact info@siren.solutions .

## Acknowledgments

Kibana is a trademark of Elasticsearch BV, registered in the U.S. and in other
countries.

Elasticsearch is a trademark of Elasticsearch BV, registered in the U.S. and in
other countries.
