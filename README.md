# Siren Investigate 10.0.0-beta-3

Siren Investigate extends Kibana 5.6.5 with data intelligence features; the core feature of
Siren Investigate is the capability to join and filter data from multiple Elasticsearch
indexes and from SQL/NOSQL data sources ("external queries").

In addition, Siren Investigate provides UI features and visualizations like dashboard
groups, tabs, cross entity relational navigation buttons, an enhanced search
results table, analytical aggregators, HTML templates on query results, and
much more.

## Upgrade from previous version

* Move any custom configurations in your old kibi.yml to the new investigate.yml file
* Reinstall plugins
* Start or restart Siren Investigate

## Releases 

Starting from Kibi version 5.4.3, all releases are done as part of Siren Platform, 
and can be downloaded from [https://support.siren.io](https://support.siren.io)

## Quick start

* Download the Siren Platform distribution: [https://support.siren.io](https://support.siren.io)
* Start Elasticsearch by running `elasticsearch\bin\elasticsearch` on Linux/OS X or `elasticsearch\bin\elasticsearch.bat` on Windows.
* Go to the `siren-investigate` directory and run `bin/siren` on Linux/OS X or `bin\siren.bat` on Windows.

A pre-configured Siren Platform is now running at [http://localhost:5606](http://localhost:5606);
a complete description of the demo is [available](https://docs.siren.io/#getting_started) in the Siren Platform documentation.

## Documentation

Visit [siren.io](https://docs.siren.io/) for the full Kibi documentation.

## Compatibility Table Siren Investigate / Elasticsearch

TODO: prepare a new table

## License

Copyright 2015–2018 SIREn Solutions

Siren Investigate is Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Please note that Siren Investigate uses the Siren Federate Plugin for Elasticsearch which is licenced as AGPL version 3.0.
For more information see the licensing section on siren.io website

  https://siren.io

## Acknowledgments

Kibana is a trademark of Elasticsearch BV, registered in the U.S. and in other
countries.
