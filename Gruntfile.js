module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
      jshint: {
        options: {
          curly: true,
          eqeqeq: true,
          immed: true,
          latedef: true,
          newcap: true,
          noarg: true,
          sub: true,
          undef: true,
          boss: true,
          eqnull: true,
          node: true,
          es5: true
        },
        all: ['tasks/**/*.js']
      },
      jasmine_node: {
        js: {
          extensions: 'js',
        },
        coffee: {
          extensions: 'coffee',
          coffee: true
        }
      }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadTasks('tasks');

    grunt.registerTask('default', ['jshint' ,'jasmine_node']);
};
