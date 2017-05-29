# Kibi 4.6.4-3

Kibi extends Kibana 4.6.4 with data intelligence features; the core feature of

Kibi is the capability to join and filter data from multiple Elasticsearch
indexes and from SQL/NOSQL data sources ("external queries").

In addition, Kibi provides UI features and visualizations like dashboard
groups, tabs, cross entity relational navigation buttons, an enhanced search
results table, analytical aggregators, HTML templates on query results, and
much more.

## Upgrade from previous version

* Move any custom configurations in your old kibi.yml to your new one
* Reinstall plugins
* Start or restart Kibi

## Quick start

* Download the Kibi demo distribution: [http://siren.solutions/kibi](http://siren.solutions/kibi)
* Start Elasticsearch by running `elasticsearch\bin\elasticsearch` on Linux/OS X or `elasticsearch\bin\elasticsearch.bat` on Windows.
* Go to the `kibi` directory and run `bin/kibi` on Linux/OS X or `bin\kibi.bat` on Windows.

A pre-configured Kibi is now running at [http://localhost:5606](http://localhost:5606);
a complete description of the demo is [available](http://siren.solutions/kibi/docs/current/getting-started.html) in the Kibi documentation.

## Documentation

Visit [siren.solutions](http://siren.solutions/kibi/docs) for the full Kibi
documentation.

## Compatibility Table Kibi / Elasticsearch

Kibi  | Elasticsearch
----- | -------------
4.6.x | 2.4.x
4.5.x | 2.3.x
4.4.x | 2.2.x, 2.3.x
0.3.x | 2.2.x
0.2.0 | 1.6, 1.7
0.1.x | 1.6, 1.7

## License

Copyright 2015–2017 SIREn Solutions

Kibi is Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Please note that Kibi uses the SIREn Join plugin which is licenced as AGPL version 3.0.
For more information see the licensing section on Kibi website

  http://siren.solutions/kibi

## Acknowledgments

Kibana is a trademark of Elasticsearch BV, registered in the U.S. and in other
countries.
