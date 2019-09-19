# patelutsav:meteor-migrations

A simple migration system for [Meteor](http://meteor.com) supporting string version migrations and command line usage.

## Installation

Meteor Migrations can be installed through Meteor's package manager. Type:

``` sh
    $ meteor add patelutsav:meteor-migrations
```

## API

### Basics

To write a simple migration, somewhere in the server section of your project define:

``` javascript
    import {Migrations} from 'meteor/patelutsav:meteor-migrations';
    Migrations.add({
        version: '1.0.0_1',
        name: 'Migration Script 1.0.0_1',
        run: function() {//code to migrate to version 1.0.0_1}
    });
```

To run this migration from within your app call:

``` javascript
    Meteor.startup(() => {
        Migrations.migrateTo('latest');
    });
```

### Advanced

A more complete set of migrations might look like:

``` javascript
    Migrations.add({
        version: '1.0.0_1',
        name: 'Migration Script 1.0.0_1',
        run: function() {
            //code to migrate to version 1.0.0_1
        }
    });
    Migrations.add({
        version: '1.0.0_2',
        name: 'Migration Script 1.0.0_2',
        run: function() {
            //code to migrate to version 1.0.0_2
        }
    });
```

As in 'Basics', you can migrate to the latest by running:

``` javascript
    Meteor.startup(function() {
        Migrations.migrateTo('latest');
    });
```

*Note: Migrations should be run from `Meteor.startup` to allow for log output configuration.*

By specifying a version, you can run individual migrating script. The migrations system will simply execute the script.  

In the above example, you could migrate directly to version 1.0.0_2 by running:

``` javascript
    Migrations.migrateTo('1.0.0_2');
```

 Note: If you are in migration locked state, it will execute the script but it will not change the locked state. For that, you will be able to unlock migration with simple command.

``` javascript
    Migrations.migrateTo('1.0.0_2');
    Migrations.unlock();
```
    
To see what version are executed, call:

``` javascript
    Migrations.getExecutedVersions();
```

### Configuration

You can configure Migrations with the `config` method. Defaults are:

``` javascript
    Migrations.config({
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
    });
```

### Logging

Migrations uses Meteor's `logging` package by default. If you want to use your
own logger (for sending to other consumers or similar) you can do so by
configuring the `logger` option.

Migrations expects a function as `logger`, and will pass arguments to it for
you to take action on.

```js
    var MyLogger = function(opts) {
        console.log('Level', opts.level);
        console.log('Message', opts.message);
        console.log('Tag', opts.tag);
    }

    Migrations.config({
        logger: MyLogger
    });

    Migrations.add({ name: 'Test Job', ... });
```

The `opts` object passed to `MyLogger` above includes `level`, `message`, and `tag`.

- `level` will be one of `info`, `warn`, `error`, `debug`.
- `message` is something like `Finished migrating.`.
- `tag` will always be `"Migrations"` (handy for filtering).

### Custom collection name

By default, the collection names are **MigrationStatus** and **MigrationList**.

### Command line use

*** DEPRECATED ***

This info is for pre 0.9 users as post 0.9 the `migrate.sh` script is no longer included in the package folder.

You can also run migrations from the command line using the included shell script. This will

1. Launch your Meteor app
2. Call `Migrations.migrateTo(version)`
3. Exit your app

For instance, from your project's root, run:

``` sh
$ ./packages/meteor-migrations/migrate.sh latest
```

You can also specify additional arguments to be passed into meteor, like:

``` sh
$ ./packages/meteor-migrations/migrate.sh latest --settings ./setting.json
```

### Errors
1. `Not migrating, control is locked`

Migrations set a lock when they are migrating, to prevent multiple instances of your clustered app from running migrations simultaneously. If your migrations throw an exception, you will need to manually remove the lock (and ensure your db is still consistent) before re-running the migration.

From the mongo shell update the migrations collection like this:

```
    $ meteor mongo

    db.MigrationStatus.update({_id:"control"}, {$set:{"locked":false}});
    exit
```

Alternatively you can unlock the collection from either server code or the meteor shell using:

```
    Migrations.unlock();
```

### Migrating from other migration package
If you are migrating from other migration package and wish to skip few of the script from running use following:
```javascript
    // Adds '2.2.0_1' and '2.2.0_2' to database without running.
    ['2.2.0_1', '2.2.0_2'].forEach(version => {
        Migrations.saveMigrationWithoutRunning(version);
    });
    // Runs migration scripts after '2.2.0_2'.
    Migrations.migrateTo('latest');
```

## Contributing

1. Write some code.
2. Write some tests.
3. From this package's local directory, start the test runner:

```
    $ meteor test-packages ./
```

4. Open http://localhost:3000/ in your browser to see the test results.

## Special Thanks
To: **Zoltan Olah**

Forked from [https://github.com/percolatestudio/meteor-migrations/](https://github.com/percolatestudio/meteor-migrations/)

## License
MIT License
