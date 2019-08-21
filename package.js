Package.describe({
  name: 'patelutsav:meteor-migrations',
  version: '0.0.4',
  // Brief, one-line summary of the package.
  summary: 'Simple migration system for Meteor based on string version number.',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/patelutsav/meteor-migrations',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.8');
  api.use('ecmascript');
  api.use('check');
  api.use('mongo');
  api.use('logging');
  api.use('underscore');
  api.mainModule('meteor-migrations.js');
});

Npm.depends({
  md5: '2.2.1',
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('patelutsav:meteor-migrations');
  api.mainModule('meteor-migrations-tests.js');
});
