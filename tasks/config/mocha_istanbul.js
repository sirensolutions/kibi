module.exports = function (grunt) {


  grunt.event.on('coverage', function (lcov, done) {
    console.log('To see the html report open:\n\ncoverage/lcov-report/index.html\n');
    done();
  });

  return {
    coverage: {
      src: 'test',
      options: {
        coverage: true, // this will make the grunt.event.on('coverage') event listener to be triggered
        mask: 'unit/server/lib/**/*.js'
      }
    }
  };

};
