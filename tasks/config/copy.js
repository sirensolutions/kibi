module.exports = function (grunt) {
  var version = grunt.config.get('pkg.version');
  var platforms = grunt.config.get('platforms');

  var config = {

    // added by kibi
    additional_ace_modes: {
      files: [
        {
          src: '<%= root %>/resources/ace_modes/mode-sparql.js',
          dest: '<%= root %>/src/kibana/bower_components/ace-builds/src-noconflict/mode-sparql.js'
        }
      ]
    },
    // added by kibi end

    kibana_src: {
      expand: true,
      cwd: '<%= app %>',
      src: '**',
      dest: '<%= build %>/src/'
    },

    server_src: {
      files: [
        {
          src: '<%= root %>/package.json',
          dest: '<%= build %>/<%= pkg.name %>/package.json'
        },
        {
          src: '<%= server %>/app.js',
          dest: '<%= build %>/<%= pkg.name %>/app.js'
        },
        {
          src: '<%= server %>/index.js',
          dest: '<%= build %>/<%= pkg.name %>/index.js'
        },
        {
          expand: true,
          cwd: '<%= server %>/bin/',
          src: '**',
          dest: '<%= build %>/<%= pkg.name %>/bin'
        },
        {
          expand: true,
          cwd: '<%= server %>/config/',
          src: '*.yml',
          dest: '<%= build %>/<%= pkg.name %>/config'
        },
        {
          expand: true,
          cwd: '<%= server %>/config/',
          src: 'datasources-schema.json',
          dest: '<%= build %>/<%= pkg.name %>/config'
        },
        {
          expand: true,
          cwd: '<%= server %>/lib/',
          src: '**',
          dest: '<%= build %>/<%= pkg.name %>/lib'
        },
        {
          expand: true,
          cwd: '<%= server %>/routes/',
          src: '**',
          dest: '<%= build %>/<%= pkg.name %>/routes'
        },
        {
          expand: true,
          cwd: '<%= server %>/views/',
          src: '**',
          dest: '<%= build %>/<%= pkg.name %>/views'
        },
        // added by kibi - copy dbdrivers needed for demo
        {
          expand: true,
          cwd: '<%= root %>/resources/dbdrivers/',
          src: '**',
          dest: '<%= build %>/<%= pkg.name %>/resources/dbdrivers'
        }
        // added by kibi end
      ]
    },

    dist: {
      options: { mode: true },
      files: [
        {
          expand: true,
          cwd: '<%= build %>/<%= pkg.name %>',
          src: '**',
          dest: '<%= build %>/dist/<%= pkg.name %>/src'
        },
        {
          expand: true,
          cwd: '<%= server %>/config/',
          src: 'kibi.yml',
          dest: '<%= build %>/dist/<%= pkg.name %>/config/'
        },
        {
          expand: true,
          cwd: '<%= server %>/config/',
          src: 'datasources-schema.json',
          dest: '<%= build %>/dist/<%= pkg.name %>/config/'
        },
      ]
    },

    deps: {
      options: { mode: '0644' },
      files: [
        {
          expand: true,
          cwd: '<%= bowerComponentsDir %>/ace-builds/src-noconflict/',
          src: 'worker-json.js',
          dest: '<%= build %>/dist/<%= pkg.name %>/src/public/'
        },
        {
          expand: true,
          cwd: '<%= bowerComponentsDir %>/eeg/lib/img/',
          src: 'ajax-loader.gif',
          dest: '<%= build %>/dist/<%= pkg.name %>/src/public/img/'
        }
      ]
    },

    versioned_dist: {
      options: { mode: true },
      files: []
    },

    plugin_readme: {
      files: [
        {
          src: '<%= build %>/<%= pkg.name %>/public/plugins/README.txt',
          dest: '<%= build %>/dist/<%= pkg.name %>/plugins/README.txt'
        }
      ]
    },

    shrinkwrap: {
      src: '<%= root %>/npm-shrinkwrap.json',
      dest: '<%= build %>/dist/<%= pkg.name %>/src/npm-shrinkwrap.json'
    }

  };

  platforms.forEach(function (platform) {
    config.versioned_dist.files.push({
      expand: true,
      cwd: '<%= build %>/dist/<%= pkg.name %>',
      src: '**',
      dest: '<%= build %>/dist/<%= pkg.name %>-' + version + '-' + platform
    });
    config.versioned_dist.files.push({
      expand: true,
      cwd: '<%= root %>/.node_binaries/' + platform,
      src: '**',
      dest: '<%= build %>/dist/<%= pkg.name %>-' + version + '-' + platform + '/node'
    });
  });

  return config;
};
