import { Tinytest } from "meteor/tinytest";
import {Migrations} from 'meteor/patelutsav:meteor-migrations';

Tinytest.add('Migrates run once and only once.', function(test) {
    const run = []; //keeps track of migrations in here
    Migrations.reset();

    // first one
    Migrations.add({
        run: function() {
            run.push('u1');
        },
        version: '1.0.0_1',
        name: 'Test: 1.0.0_1'
    });

    // migrates once
    Migrations.migrateTo('latest');
    test.equal(run, ['u1'], 'Expected value to be ["u1"]');
    test.equal(Migrations.getExecutedVersions(), ['1.0.0_1'], 'Expected value to be ["1.0.0_1"]');

    // shouldn't do anything
    Migrations.migrateTo('latest');
    test.equal(run, ['u1'], 'Expected value to be ["u1"]');
    test.equal(Migrations.getExecutedVersions(), ['1.0.0_1'], 'Expected value to be ["1.0.0_1"]');
});

Tinytest.add('Migrates run twice.', function(test) {
    const run = []; //keeps track of migrations in here
    Migrations.reset();

    // first one
    Migrations.add({
        run: function() {
            run.push('u1');
        },
        version: '1.0.0_1',
        name: 'Test: 1.0.0_1'
    });

    // migrates once
    Migrations.migrateTo('latest');
    test.equal(run, ['u1'], 'Expected value to be ["u1"]');
    test.equal(Migrations.getExecutedVersions(), ['1.0.0_1'], 'Expected value to be ["1.0.0_1"]');

    Migrations.add({
        run: function() {
            run.push('u2');
        },
        version: '1.0.0_2',
        name: 'Test: 1.0.0_2'
    });

    // shouldn't do anything
    Migrations.migrateTo('latest');
    test.equal(run, ['u1', 'u2'], 'Expected value to be ["u1", "u2"]');
    test.equal(Migrations.getExecutedVersions(), ['1.0.0_1', '1.0.0_2'], 'Expected value to be ["1.0.0_1", "1.0.0_2"]');
});

Tinytest.add('Migrates should lock on introduction of old version script.', function(test) {
    const run = []; //keeps track of migrations in here
    Migrations.reset();

    // first one
    Migrations.add({
        run: function() {
            run.push('u1');
        },
        version: '1.0.0_1',
        name: 'Test: 1.0.0_1'
    });

    // migrates once
    Migrations.migrateTo('latest');
    test.equal(run, ['u1'], 'Expected value to be ["u1"]');
    test.equal(Migrations.getExecutedVersions(), ['1.0.0_1'], 'Expected value to be ["1.0.0_1"]');

    Migrations.add({
        run: function() {
            run.push('u3');
        },
        version: '1.0.0_3',
        name: 'Test: 1.0.0_3'
    });

    // shouldn't do anything
    Migrations.migrateTo('latest');
    test.equal(run, ['u1', 'u3'], 'Expected value to be ["u1", "u3"]');
    test.equal(Migrations.getExecutedVersions(), ['1.0.0_1', '1.0.0_3'], 'Expected value to be ["1.0.0_1", "1.0.0_3"]');

    Migrations.add({
        run: function() {
            run.push('u2');
        },
        version: '1.0.0_2',
        name: 'Test: 1.0.0_2'
    });

    // shouldn't do anything
    Migrations.migrateTo('latest');
    test.equal(run, ['u1', 'u3'], 'Expected value to be ["u1", "u3"]');
    test.equal(Migrations.getExecutedVersions(), ['1.0.0_1', '1.0.0_3'], 'Expected value to be ["1.0.0_1", "1.0.0_3"]');
    test.equal(Migrations._getControl().locked, true);
});

Tinytest.add(
    'Migration callbacks include the migration as an argument',
    function(test) {
        let contextArg;
        Migrations.reset();

        // add the migrations
        const migration = {
            run: function(m) {
                contextArg = m;
            },
            version: '1.0.0_3',
            name: 'Test: 1.0.0_3'
        };
        Migrations.add(migration);

        Migrations.migrateTo('latest');
        test.equal(contextArg === migration, true);
    },
);

Tinytest.add(
    'Migration rerun should add/update script to db',
    function(test) {
        const run = [];
        Migrations.reset();

        let migration = {
            run: function() {
                run.push('u1');
            },
            version: '1.0.0_1',
            name: 'Test: 1.0.0_1'
        };

        Migrations.add(migration);

        Migrations.migrateTo('1.0.0_1');
        test.equal(run, ['u1'], 'Expected value to be ["u1"]');
        test.equal(Migrations.getExecutedVersions(), ['1.0.0_1'], 'Expected value to be ["1.0.0_1"]');

        Migrations._list = [];
        migration = {
            ...migration,
            run : function () {
                run.push('u2');
            }
        };
        Migrations.add(migration);
        Migrations.migrateTo('1.0.0_1');
        test.equal(run, ['u1', 'u2'], 'Expected value to be ["u1", "u2"]');
        test.equal(Migrations.getExecutedVersions(), ['1.0.0_1'], 'Expected value to be ["1.0.0_1"]');
    },
);

Tinytest.add('Does nothing for no migrations.', function(test) {
    Migrations.reset();

    // shouldnt do anything
    Migrations.migrateTo('latest');
    test.equal(Migrations.getExecutedVersions(), []);
});

Tinytest.add('Checks that locking works correctly', function(test) {
    let run = []; //keeps track of migrations in here
    Migrations.reset();

    // add the migrations
    Migrations.add({
        name: 'Test: 1.0.0_1',
        version: '1.0.0_1',
        run: function() {
            run.push('u1');

            // attempts a migration from within the migration, this should have no
            // effect due to locking
            Migrations.migrateTo('latest');
            test.equal(Migrations._getControl().locked, true);
        },
    });

    // migrates up, should only migrate once
    Migrations.migrateTo('latest');
    test.equal(run, ['u1'], 'Expected value to be ["u1"]');
    test.equal(Migrations.getExecutedVersions(), ['1.0.0_1'], 'Expected value to be ["1.0.0_1"]');
    test.equal(Migrations._getControl().locked, false);
});