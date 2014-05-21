/* jshint node: true */
'use strict';

require('jasmine-node');
var _ = require('underscore');

var runWithCoverage = function (options) {
  var istanbul = require('istanbul'),
      path = require('path'),
      mkdirp = require('mkdirp'),
      fs = require('fs');

  // coverage options
  options.coverage = _.defaults(options.coverage, {
    excludes: [],
    savePath: 'coverage',
    formats: ['lcov'],
    isVerbose: false
  });

  var dir = path.resolve(process.cwd(), options.coverage.savePath);
  mkdirp.sync(dir); // ensure we fail early if we cannot do this

  var reports = _.map(options.coverage.formats, function (format) {
    return istanbul.Report.create(format, { dir: dir });
  });

  options.coverage.excludes.push('**/node_modules/**');

  // set up require hooks to instrument files as they are required
  istanbul.matcherFor({
    root: options.projectRoot || process.cwd(),
    includes: [ '**/*.js' ],
    excludes: options.coverage.excludes
  }, function (err, matchFn) {
    if (err) {
      options.done(err);
      return;
    }

    var coverageVar = '$$cov_' + new Date().getTime() + '$$',
        instrumenter = new istanbul.Instrumenter({ coverageVariable: coverageVar }),
        transformer = instrumenter.instrumentSync.bind(instrumenter),
        hookOpts = { verbose: options.coverage.isVerbose };

    istanbul.hook.hookRequire(matchFn, transformer, hookOpts);

    // initialize the global variable
    global[coverageVar] = {};

    // write the coverage reports when jasmine completes
    var onComplete = options.onComplete;
    options.onComplete = function (runner, log) {
      var cov;
      if (typeof global[coverageVar] === 'undefined' || Object.keys(global[coverageVar]).length === 0) {
        console.error('No coverage information was collected, exit without writing coverage information');
        return;
      } else {
        cov = global[coverageVar];
      }
      mkdirp.sync(dir); // yes, do this again since some test runners could clean the dir initially created

      var file = path.resolve(dir, 'coverage.json');
      fs.writeFileSync(file, JSON.stringify(cov), 'utf8');

      var collector = new istanbul.Collector();
      collector.add(cov);

      _.each(reports, function (report) {
        report.writeReport(collector, true);
      });

      // call the old onComplete
      onComplete(runner, log);
    };

    jasmine.executeSpecsInFolder(options);
  });
};

module.exports = function (grunt) {
  var onComplete = function(options) {
    return function() {
      if (options.forceExit) {
        process.exit(global.jasmineResult.fail ? 1 : 0);
      }
      options.done(!global.jasmineResult.fail);
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
      watchFolders:    [],
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

    if(options.isVerbose) {
      options.verbose = options.isVerbose;
    }

    if(options.specFolders.length === 0) {
      options.specFolders.push(options.projectRoot);
    }

    options.onComplete = onComplete(options);

    try {
      var matcher = "";
      if (options.match !== '.') {
        matcher = options.match;
      } else if (options.matchAll) {
        matcher = "" + options.match + "(" + options.extensions + ")$";
      } else {
        matcher = "" + options.match + "spec\\.(" + options.extensions + ")$";
      }
      options.regExpSpec = new RegExp(matcher, "i");
    } catch (_error) {
      grunt.warn(_error);
      return;
    }

    if (options.coverage) {
      runWithCoverage(options);
    } else {
      jasmine.executeSpecsInFolder(options);
    }
  });
};
