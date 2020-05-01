import {Meteor} from 'meteor/meteor';
import {isFormatedVersion} from './utils';

const md5 = require('md5');

export const name = 'meteor-migrations';

export const Migrations = {
  _list: [],
  options: {
    // false disables logging
    log: true,
    // null or a function
    logger: null,
    // enable/disable info log "already at latest."
    logIfLatest: true,
    // stop if old version script added
    stopIfOldVersionScriptAdded: true,
    // stop if old version script updated
    stopIfOldVersionScriptUpdated: true,
    // migrations collection name
    statusCollectionName: 'MigrationStatus',
    listCollectionName: 'MigrationList',
  },
  config: function (opts) {
    this.options = _.extend({}, this.options, opts);
  },
  _findIndexByVersion: function (version) {
    if (version === '') {
      return -1;
    }
    for (let i = 0; i < this._list.length; i++) {
      if (this._list[i].version === version) return i;
    }

    throw new Error("Can't find migration version " + version);
  },
  _findVersionsToExecute: function () {
    const versions = this._list.map(item => item.version);
    const executedVersions = this._listCollection.find({}).map(item => item._id);
    const versionsToExecute = versions.filter(item => executedVersions.indexOf(item) < 0);
    return versionsToExecute;
  },
  _checkIfOldVersionScriptAdded: function (versions) {
    let check = false;
    const list = [];
    const lastScriptIndex = this._findIndexByVersion(this._getControl().version);
    versions.forEach((version) => {
      if (this._findIndexByVersion(version) < lastScriptIndex) {
        check = true;
        list.push(version);
      }
    });
    return {check, list};
  },
  _checkIfOldVersionScriptUpdated: function () {
    let check = false;
    const list = []
    const oldMigrations = this._listCollection.find({}).fetch();
    oldMigrations.forEach((migration) => {
      const {run, _id} = migration;
      const matchingMigration = this._list.find(item => item.version === _id);
      if (!matchingMigration) {
        check = true;
        list.push(_id);
      } else if (run !== md5(matchingMigration.run.toString())) {
        check = true;
        list.push(_id);
      }
    });
    return {check, list};
  },
  _insertSuccessfullyRanMigration: function (migration, rerun) {
    const data = {
      run: md5(migration.run.toString()),
      atDate: new Date(),
      name: migration.name,
      _id: migration.version,
    };
    const {_id, ...rest} = data;
    this._listCollection.upsert({_id}, {$set: rest});
  },
  _setControl: function (control) {
    // be quite strict
    check(control.version, String);
    check(control.locked, Boolean);

    let data = {
      version: control.version,
      locked: control.locked,
      updateAt: new Date(),
    };

    this._statusCollection.update(
      {_id: 'control'},
      {$set: data},
      {upsert: true},
    );

    return control;
  },
  getExecutedVersions: function () {
    const oldMigrations = this._listCollection.find({}).fetch();
    return oldMigrations.map((migration) => migration._id);
  },
  _getControl: function () {
    let control = this._statusCollection.findOne({_id: 'control'});

    return control || this._setControl({version: '', locked: false});
  },
  reset: function () {
    this._list = [];
    removeAll(this._statusCollection);
    removeAll(this._listCollection);

    function removeAll(collection) {
      collection.find({}).fetch().forEach(item => {
        collection.remove({_id: item._id});
      })
    }
  },
  lock: function () {
    return this._statusCollection.update({_id: 'control'}, {$set: {locked: true}});
  },
  unlock: function () {
    this._statusCollection.update({_id: 'control'}, {$set: {locked: false}});
  },
  add: function (migration) {
    const {version, run, name} = migration;
    if (typeof run !== 'function')
      throw new Error('Migration must supply an run function.');

    if (typeof name !== 'string')
      throw new Error('Migration must supply an name as string.');

    if (!isFormatedVersion(version))
      throw new Error('Supplied version: ' + version + '. Migration must supply a version number as string (eg. 0.0.0_0).');

    // Freeze the migration object to make it hereafter immutable
    Object.freeze(migration);

    this._list.push(migration);
  },
  migrateTo: function (command) {
    if (this._getControl().locked) {
      log.info('Not migrating, control is locked.');
      return;
    }
    if (_.isUndefined(command) || command === '')
      throw new Error('Cannot migrate using invalid command: ' + command);

    if (this._list.length === 0) {
      log.info('Cannot migrate : No migration script found.');
      return;
    }

    this.lock();

    this._list = this._list
      .map(m => m.version)
      .map(a => a.replace(/\d+/g, n => +n + 100000))
      .sort()
      .map(a => a.replace(/\d+/g, n => +n - 100000))
      .map(version => this._list.find(m => m.version === version));

    let versionsToExecute = [];
    let rerun = false;

    if (command === 'latest') {
      versionsToExecute = this._findVersionsToExecute();
      const oldVersionScripts = this._checkIfOldVersionScriptAdded(versionsToExecute);
      if (oldVersionScripts.check && this.options.stopIfOldVersionScriptAdded) {
        log.info('Cannot migrate : Old version script found. Version: ' + oldVersionScripts.list.join(', '));
        return;
      }
      const oldVersionUpdated = this._checkIfOldVersionScriptUpdated();
      if (oldVersionUpdated.check && this.options.stopIfOldVersionScriptUpdated) {
        log.info('Cannot migrate : Old version script updated. Version: ' + oldVersionUpdated.list.join(', '));
        return;
      }
    } else if (isFormatedVersion(command) && this._findIndexByVersion(command) > -1) {
      versionsToExecute = [command];
      rerun = true;
    } else {
      throw new Error('Cannot migrate using invalid command: ' + command);
    }

    this._migrateTo(versionsToExecute, rerun);
    log.info('Finished migrating.');
    this.unlock();
  },
  _migrateTo: function (versions, rerun = false) {
    const self = this;
    if (_.isEmpty(versions)) {
      log.info('Not migrating, no new script found.');
      this.unlock();
      return;
    }
    if (rerun) {
      migrate(this._findIndexByVersion(versions[0]), rerun);
    } else {
      versions.forEach(version => {
        migrate(this._findIndexByVersion(version))
      });
      this._setControl({version: _.last(versions), locked: false});
    }

    function migrate(index, rerun = false) {
      let migration = self._list[index];

      function scriptName() {
        return ' (' + migration.name + ')';
      }

      log.info(
        'Running version: ' +
        migration.version +
        scriptName(),
      );

      const run = Meteor.wrapAsync(async (migration, done) => {
        await migration.run(migration);
        done();
      });
      try {
        run(migration);

        self._insertSuccessfullyRanMigration(migration, rerun);
      } catch (e) {
        throw new Error('Cannot migrate: Error while migrating script: ' + migration.version + '\nError Stack: ' + e);
      }
    }
  },
  saveMigrationWithoutRunning: function (version) {
    this.lock();
    if (!isFormatedVersion(version)) {
      throw new Error('Supplied version: ' + version + '. Parameter must supply a version number as string (eg. 0.0.0_0).');
    }
    if (this._findIndexByVersion(version) === -1) {
      throw new Error('Supplied version: ' + version + ' does not exist.');
    }
    this._insertSuccessfullyRanMigration(this._list.find(migration => migration.version === version));
    this._setControl({version, locked: false});
    console.log('Successfully saved Migration version: ' + version + ' to database.');
    this.unlock();
  },
};

Meteor.startup(function () {
  let options = Migrations.options;

  // collection holding the control record
  Migrations._statusCollection = new Mongo.Collection(options.statusCollectionName);
  Migrations._listCollection = new Mongo.Collection(options.listCollectionName);

  if (process.env.MIGRATE) Migrations.migrateTo(process.env.MIGRATE);
});

function createLogger(prefix) {
  check(prefix, String);

  // Return noop if logging is disabled.
  if (Migrations.options.log === false) {
    return function () {
    };
  }

  return function (level, message) {
    check(level, Match.OneOf('info', 'error', 'warn', 'debug'));
    check(message, String);

    let logger = Migrations.options && Migrations.options.logger;

    if (logger && _.isFunction(logger)) {
      logger({
        level: level,
        message: message,
        tag: prefix,
      });
    } else {
      Log[level]({message: prefix + ': ' + message});
    }
  };
}

const log = createLogger('Migrations');

['info', 'warn', 'error', 'debug'].forEach(function (level) {
  log[level] = _.partial(log, level);
});
