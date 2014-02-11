/* jshint node: true */
'use strict';

var jasmine = require('jasmine-node');
var _       = require('underscore');

var runWithCoverage = function (options, projectRoot, runFn, done) {
  var istanbul = require('istanbul'),
      path = require('path'),
      mkdirp = require('mkdirp'),
      fs = require('fs');

  // coverage options
  options = _.defaults(options, {
    excludes: [],
    savePath: 'coverage',
    formats: ['lcov'],
    isVerbose: false
  });

  var dir = path.resolve(process.cwd(), options.savePath);
  mkdirp.sync(dir); // ensure we fail early if we cannot do this

  var reports = _.map(options.formats, function (format) {
    return istanbul.Report.create(format, { dir: dir });
  });

  options.excludes.push('**/node_modules/**');

  // set up require hooks to instrument files as they are required
  istanbul.matcherFor({
    root: projectRoot || process.cwd(),
    includes: [ '**/*.js' ],
    excludes: options.excludes
  }, function (err, matchFn) {
    if (err) {
      done(err);
      return;
    }

    var coverageVar = '$$cov_' + new Date().getTime() + '$$',
        instrumenter = new istanbul.Instrumenter({ coverageVariable: coverageVar }),
        transformer = instrumenter.instrumentSync.bind(instrumenter),
        hookOpts = { verbose: options.isVerbose };

    istanbul.hook.hookRequire(matchFn, transformer, hookOpts);

    // initialize the global variable
    global[coverageVar] = {};

    // write the coverage reports when jasmine completes
    process.once('exit', function () {
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
    });

    runFn();
  });
};

module.exports = function (grunt) {
    var regExpSpec = function(options) {
      var match      = options.match;
      var nameMatch  = options.matchall ? "" : options.specNameMatcher + "\\.";
      var extensions = options.extensions;
      return new RegExp(match + nameMatch + "(" + extensions + ")$", 'i');
    };
    var onComplete = function(options) {
      return function(runner, log) {
        var count = runner.results().failedCount;
        if (options.forceExit) { 
          process.exit(count === 0 ? 0 : 1);
        }
        jasmine.getGlobal().jasmine.currentEnv_ = undefined;
        options.done(count === 0);
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

      var runFn = _.bind(jasmine.executeSpecsInFolder, jasmine, options);
      if (options.coverage) {
        runWithCoverage(options.coverage, options.projectRoot, runFn, options.done);
      } else {
        runFn();
      }
  });
};
