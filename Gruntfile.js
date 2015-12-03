module.exports = function (grunt) {


  // added by kibi - measures the time each task takes
  require('time-grunt')(grunt);


  // set the config once before calling load-grunt-config
  // and once durring so that we have access to it via
  // grunt.config.get() within the config files
  var config = {
    pkg: grunt.file.readJSON('package.json'),
    root: __dirname,
    src: __dirname + '/src', // unbuild version of build
    build: __dirname + '/build', // copy of source, but optimized
    app: __dirname + '/src/kibana', // source directory for the app
    plugins: __dirname + '/src/kibana/plugins', // source directory for the app
    server: __dirname + '/src/server', // source directory for the server
    target: __dirname + '/target',  // location of the compressed build targets
    buildApp: __dirname + '/build/kibi', // build directory for the app
    configFile: __dirname + '/src/server/config/kibi.yml',

    nodeVersion: '0.10.35',
    platforms: ['darwin-x64', 'linux-x64', 'linux-x86', 'windows', 'windows64'],
    services: [ [ 'launchd', '10.9'], [ 'upstart', '1.5'], [ 'systemd', 'default'], [ 'sysv', 'lsb-3.1' ] ],

    unitTestDir: __dirname + '/test/unit',
    testUtilsDir: __dirname + '/test/utils',
    bowerComponentsDir: __dirname + '/src/kibana/bower_components',

    devPlugins: 'vis_debug_spy',

    meta: {
      banner: '/*! <%= package.name %> - v<%= package.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= package.homepage ? " * " + package.homepage + "\\n" : "" %>' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= package.author.company %>;' +
        ' Licensed <%= package.license %> */\n'
    },
    lintThese: [
      'Gruntfile.js',
      '<%= root %>/tasks/**/*.js',
      '<%= src %>/kibana/*.js',
      '<%= src %>/server/**/*.js',
      '<%= src %>/kibana/{components,directives,factories,filters,plugins,registry,services,utils}/**/*.js',
      '<%= unitTestDir %>/**/*.js',
      '!<%= unitTestDir %>/specs/vislib/fixture/**/*'
    ],
    lessFiles: [
      '<%= src %>/kibana/components/*/*.less',
      '<%= src %>/kibana/styles/main.less',
      '<%= src %>/kibana/components/vislib/styles/main.less',
      '<%= plugins %>/dashboard/styles/main.less',
      '<%= plugins %>/discover/styles/main.less',
      '<%= plugins %>/settings/styles/main.less',
      '<%= plugins %>/settings/sections/relations/styles/relations.less',
      '<%= plugins %>/visualize/styles/main.less',
      '<%= plugins %>/visualize/styles/visualization.less',
      '<%= plugins %>/visualize/styles/main.less',
      '<%= plugins %>/table_vis/table_vis.less',
      '<%= plugins %>/metric_vis/metric_vis.less',
      '<%= plugins %>/markdown_vis/markdown_vis.less',
      '<%= src %>/kibana/components/agg_types/styles/*.less',
      '<%= plugins %>/sindicetech/**/*.less',
      '<%= plugins %>/dashboard/directives/st_dashboard_toolbar/*.less',
      '<%= plugins %>/kibi/**/*.less',
      '<%= src %>/kibana/directives/st_*.less',
      '<%= src %>/kibana/components/sindicetech/**/*.less',
      '<%= src %>/kibana/components/kibi/**/*.less'
    ],
    newer: {
      options: {
        override: function (details, include) {
          if (details.task === 'less') {
            checkForNewerImports(details.path, details.time, include);
          }
          else {
            include(false);
          }
        }
      }
    }
  };

  grunt.config.merge(config);

  //checkForNewerImports function taken from gist at
  // https://gist.github.com/migreva/2a926b95f25366da657c
  var fs = require('fs');
  var path = require('path');

  function checkForNewerImports(lessFile, mTime, include) {
    fs.readFile(lessFile, 'utf8', function (err, data) {
      var lessDir = path.dirname(lessFile);
      var regex = /@import "(.+?)(\.less)?";/g;
      var shouldInclude = false;
      var match;

      while ((match = regex.exec(data)) !== null) {
        // All of my less files are in the same directory,
        // other paths may need to be traversed for different setups...
        var importFile = lessDir + '/' + match[1] + '.less';
        if (fs.existsSync(importFile)) {
          var stat = fs.statSync(importFile);
          if (stat.mtime > mTime) {
            shouldInclude = true;
            break;
          }
        }
      }
      include(shouldInclude);
    });
  }

  var dirname = require('path').dirname;
  var indexFiles = grunt.file.expand({ cwd: 'src/kibana/plugins' }, [
    '*/index.js',
    '!' + config.devPlugins + '/index.js'
  ]);
  var moduleIds = indexFiles.map(function (fileName) {
    return 'plugins/' + dirname(fileName) + '/index';
  });

  config.bundled_plugin_module_ids = grunt.bundled_plugin_module_ids = moduleIds;

  // load plugins
  require('load-grunt-config')(grunt, {
    configPath: __dirname + '/tasks/config',
    init: true,
    config: config
  });

  // load task definitions
  grunt.task.loadTasks('tasks');
};
