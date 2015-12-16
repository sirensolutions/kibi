module.exports = function (grunt) {
  var notIncludedComponents = '{font-awesome,requirejs,zeroclipboard,leaflet-draw,icons}';
  return {
    build: '<%= build %>',
    target: '<%= target %>',
    unneeded_source_in_build: {
      src: [
        // select all top level folders in bower_components
        '<%= build %>/<%= pkg.name %>/public/bower_components/*',

        // exclude the following top level components
        '!<%= build %>/<%= pkg.name %>/public/bower_components/' + notIncludedComponents,

        // remove the all bower_components except for notIncludedComponents, and keep the one files they need
        '<%= build %>/<%= pkg.name %>/public/bower_components/' + notIncludedComponents + '/*',
        '!<%= build %>/<%= pkg.name %>/public/bower_components/requirejs/require.js',
        '!<%= build %>/<%= pkg.name %>/public/bower_components/font-awesome/fonts',
        '!<%= build %>/<%= pkg.name %>/public/bower_components/zeroclipboard/dist',
        '!<%= build %>/<%= pkg.name %>/public/bower_components/leaflet-draw/dist',
        '!<%= build %>/<%= pkg.name %>/public/bower_components/icons/lib',

        // delete the contents of the dist dir, except the ZeroClipboard.swf file
        '<%= build %>/<%= pkg.name %>/public/bower_components/zeroclipboard/dist/*',
        '!<%= build %>/<%= pkg.name %>/public/bower_components/zeroclipboard/dist/ZeroClipboard.swf',

        '<%= build %>/<%= pkg.name %>/public/**/_empty_',
        '<%= build %>/<%= pkg.name %>/public/**/*.less',
        '<%= build %>/<%= pkg.name %>/public/config',
        '<%= build %>/<%= pkg.name %>/public/{css-builder,normalize}.js',
        '<%= app %>/public/{css-builder,normalize}.js'
      ]
    },
    dev_only_plugins: '<%= build %>/src/plugins/<%= devPlugins %>',
    test_from_node_modules: '<%= build %>/dist/<%= pkg.name %>/src/node_modules/**/*test*'
  };
};
