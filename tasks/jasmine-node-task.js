'use strict';

var jasmine = require('jasmine-node');
var _       = require('underscore');

module.exports = function (grunt) {
    var regExpSpec = function(options) {
      var match      = options.match;
      var nameMatch  = options.matchall ? "" : options.specNameMatcher + "\\.";
      var extensions = options.extensions;
      return new RegExp(match + nameMatch + "(" + extensions + ")$", 'i');
    };
    var onComplete = function(options) {
      return function(runner, log) {
        if (options.forceExit) { 
          var count = runner.results().failedCount;
          process.exit(count === 0 ? 0 : 1);
        }
        jasmine.getGlobal().jasmine.currentEnv_ = undefined;
        options.done();
      };
    };
    grunt.registerMultiTask("jasmine_node", "Runs jasmine-node.", function() {
      var self = this;

      var options = _.defaults(this.data, {
        match:           ".",
        matchall:        false,
        specNameMatcher: 'spec',
        extensions:      'js',
        specFolders:     [],
        isVerbose:       true,
        showColors:      true,
        teamcity:        false,
        useRequireJs:    false,
        coffee:          false,
        projectRoot:     ".",
        done:            self.async(),
        junitreport:     {
          report: false,
          savePath : "./reports/",
          useDotNotation: true,
          consolidate: true
        }
      });
      
      if(options.jUnit) {
        options.junitreport = options.jUnit;
      }

      if(options.useCoffee) {
        options.coffee = options.useCoffee;
      }

      if(options.specFolders.length == 0) {
        options.specFolders.push(options.projectRoot);
      }

      if(_.isUndefined(options.regExpSpec)) {
        options.regExpSpec = regExpSpec(options);
      }
      options.onComplete = onComplete(options);
      
      jasmine.executeSpecsInFolder(options);
  });
};
