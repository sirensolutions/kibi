# Kibi 5.3.2

Kibi extends Kibana 5.2.2 with data intelligence features; the core feature of
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

### Kibi 5

Ideally, you should be running Elasticsearch and Kibana with matching version numbers. If your Elasticsearch has an older version number or a newer _major_ number than Kibana, then Kibana will fail to run. If Elasticsearch has a newer minor or patch number than Kibana, then the Kibana Server will log a warning.

_Note: The version numbers below are only examples, meant to illustrate the relationships between different types of version numbers._

| Situation                 | Example Kibana version     | Example ES version | Outcome |
| ------------------------- | -------------------------- |------------------- | ------- |
| Versions are the same.    | 5.1.2                      | 5.1.2              | 💚 OK      |
| ES patch number is newer. | 5.1.__2__                  | 5.1.__5__          | ⚠️ Logged warning      |
| ES minor number is newer. | 5.__1__.2                  | 5.__5__.0          | ⚠️ Logged warning      |
| ES major number is newer. | __5__.1.2                  | __6__.0.0          | 🚫 Fatal error      |
| ES patch number is older. | 5.1.__2__                  | 5.1.__0__          | ⚠️ Logged warning      |
| ES minor number is older. | 5.__1__.2                  | 5.__0__.0          | 🚫 Fatal error      |
| ES major number is older. | __5__.1.2                  | __4__.0.0          | 🚫 Fatal error      |

### Kibi 4

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
