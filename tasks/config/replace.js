var join = require('path').join;
module.exports = function (grunt) {
  var build = grunt.config.get('build');
  var src = grunt.config.get('src');
  var app = grunt.config.get('app');

  var config = {
    options: {
      patterns: [
        { match: 'version', replacement: '<%= pkg.version %>' },
        { match: 'buildNum', replacement: '<%= buildNum %>' },
        { match: 'commitSha', replacement: '<%= commitSha %>' }
      ]
    },
    dist: {
      files: [
        {
          src: [join(src, 'server', 'bin', 'kibi.sh')],
          dest: join(build, 'dist', '<%= pkg.name %>', 'bin', '<%= pkg.name %>'),
          mode: 0755
        },
        {
          src: [join(src, 'server', 'bin', 'create_symlink.sh')],
          dest: join(build, 'dist', '<%= pkg.name %>', 'bin', 'create_symlink.sh'),
          mode: 0755
        },
        {
          src: [join(src, 'server', 'bin', 'replace_encryption_key.sh')],
          dest: join(build, 'dist', '<%= pkg.name %>', 'bin', 'replace_encryption_key.sh'),
          mode: 0755
        },
        {
          src: [join(src, 'server', 'bin', 'replace_encryption_key.bat')],
          dest: join(build, 'dist', '<%= pkg.name %>', 'bin', 'replace_encryption_key.bat')
        },
        {
          src: [join(src, 'server', 'bin', 'kibi.bat')],
          dest: join(build, 'dist', '<%= pkg.name %>', 'bin', '<%= pkg.name %>.bat')
        },
        {
          src: [join(src, 'server', 'config', 'index.js')],
          dest: join(build, 'dist', '<%= pkg.name %>', 'src', 'config', 'index.js')
        }
      ]
    },
    build_props: {
      files: [
        {
          src: [join(app, 'index.html')],
          dest: join(build, 'src', 'index.html')
        }
      ]
    }
  };

  return config;
};
