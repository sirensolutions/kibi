require.config({
  baseUrl: './',
  paths: {
    kibana: 'index',
    // special utils
    routes: 'utils/routes/index',
    errors: 'components/errors',
    modules: 'utils/modules',
    lodash: 'utils/_mixins',

    // bower_components
    'angular-bindonce': 'bower_components/angular-bindonce/bindonce',
    'angular-bootstrap': 'bower_components/angular-bootstrap/ui-bootstrap-tpls',
    'angular-elastic': 'bower_components/angular-elastic/elastic',
    'angular-route': 'bower_components/angular-route/angular-route',
    'angular-ui-ace': 'bower_components/angular-ui-ace/ui-ace',
    'angular-animate': 'bower_components/angular-animate/angular-animate',
    ace: 'bower_components/ace-builds/src-noconflict/ace',
    'ace-json':   'bower_components/ace-builds/src-noconflict/mode-json',
    'ace-jade':   'bower_components/ace-builds/src-noconflict/mode-jade',
    'ace-sql':   'bower_components/ace-builds/src-noconflict/mode-sql',
    'ace-sparql': 'bower_components/ace-builds/src-noconflict/mode-sparql',
    angular: 'bower_components/angular/angular',
    async: 'bower_components/async/lib/async',
    bower_components: 'bower_components',
    css: 'bower_components/require-css/css',
    d3: 'bower_components/d3/d3',
    elasticsearch: 'bower_components/elasticsearch/elasticsearch.angular',
    faker: 'bower_components/Faker/faker',
    file_saver: 'bower_components/FileSaver/FileSaver',
    gridster: 'bower_components/gridster/dist/jquery.gridster',
    'leaflet-heat': 'bower_components/Leaflet.heat/dist/leaflet-heat',
    jquery: 'bower_components/jquery/dist/jquery',
    'jquery-ui': 'bower_components/jquery-ui/jquery-ui',
    leaflet: 'bower_components/leaflet/dist/leaflet',
    'leaflet-draw': 'bower_components/leaflet-draw/dist/leaflet.draw',
    lodash_src: 'bower_components/lodash/dist/lodash',
    'lodash-deep': 'bower_components/lodash-deep/factory',
    moment: 'bower_components/moment/moment',
    'ng-clip': 'bower_components/ng-clip/src/ngClip',
    text: 'bower_components/requirejs-text/text',
    zeroclipboard: 'bower_components/zeroclipboard/dist/ZeroClipboard',
    marked: 'bower_components/marked/lib/marked',
    numeral: 'bower_components/numeral/numeral',
    semver: 'bower_components/semver/semver.browser',

    'angular-jqcloud':  'bower_components/angular-jqcloud/angular-jqcloud',
    'angular-sanitize': 'bower_components/angular-sanitize/angular-sanitize',
    jqcloud:            'bower_components/jqcloud2/dist/jqcloud',
    'ng-tags-input':    'bower_components/ng-tags-input/ng-tags-input',
    kibiutils:          'bower_components/kibiutils/kibiutils',
    eeg:                'bower_components/eeg/lib/js/eeg',
    antlr4:             'bower_components/antlr4/release/antlr4',
    'antlr4-sparql':    'bower_components/antlr4-sparql/release/antlr4-sparql',
    'antlr4-sql':       'bower_components/antlr4-sql/release/antlr4-sql',
    qtip2:              'bower_components/qtip2/jquery.qtip.min',
    vis:                'bower_components/vis/dist/vis.min'
  },
  shim: {
    angular: {
      deps: ['jquery'],
      exports: 'angular'
    },
    gridster: [
      'jquery',
      'css!bower_components/gridster/dist/jquery.gridster.css',
      'css!bower_components/icons/lib/stylesheets/FontMoreAwesome.css'
    ],
    'angular-route': ['angular'],
    'angular-animate': ['angular'],
    'elasticsearch': ['angular'],
    'angular-bootstrap': ['angular'],
    'angular-bindonce': ['angular'],
    'ace-json': ['ace'],
    'ace-sql': ['ace'],
    'ace-sparql': ['ace'],
    'ace-jade': ['ace'],
    'angular-ui-ace': ['angular', 'ace', 'ace-json', 'ace-jade', 'ace-sql', 'ace-sparql'],
    'ng-clip': ['angular', 'zeroclipboard'],
    'jqcloud': ['css!bower_components/jqcloud2/dist/jqcloud.css'],
    'ng-tags-input': ['angular', 'css!bower_components/ng-tags-input/ng-tags-input.css'],
    'eeg' : ['css!bower_components/eeg/lib/css/eeg.css', 'jquery', 'd3'],
    vis: ['css!bower_components/vis/dist/vis.css'],
    'antlr4-sparql' : ['antlr4'],
    'antlr4-sql' : ['antlr4'],
    'qtip2' : ['jquery'],

    'leaflet-heat': {
      deps: ['leaflet']
    },
    file_saver: {
      exports: 'saveAs'
    },
    'leaflet-draw': {
      deps: ['leaflet', 'css!bower_components/leaflet-draw/dist/leaflet.draw.css']
    },
    leaflet: {
      deps: ['css!bower_components/leaflet/dist/leaflet.css']
    },
    marked: {
      exports: 'marked'
    }
  },
  waitSeconds: 60
});
