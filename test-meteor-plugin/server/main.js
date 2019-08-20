import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {Migrations} from 'meteor/patelutsav:meteor-migrations';

Meteor.startup(() => {
    ['2.2.0_1', '2.2.0_2'].forEach(version => {
        Migrations.addMigrationWithoutRunning(version);
    });
    Migrations.migrateTo('latest');
});

Migrations.add({
    version: '2.2.0_1',
    name: 'test 2.2.0_1',
    run: async () => {
        await test('Done 2.2.0_1');
    },
});

Migrations.add({
    version: '2.2.0_3',
    name: 'test 2.2.0_3',
    run: async () => {
        await test('Done 2.2.0_3');
    },
});

Migrations.add({
    version: '2.2.0_4',
    name: 'test 2.2.0_4',
    run: async () => {
        await test('Done 2.2.0_4');
    },
});

Migrations.add({
    version: '2.2.0_2',
    name: 'test 2.2.0_2',
    run: async () => {
        await test('Done 2.2.0_2');
    },
});


const test1 = new Mongo.Collection('test');

Migrations.add({
    version: '2.2.0_5',
    name: 'test 2.2.0_5',
    run: async () => {
        await test1.rawDatabase();
    },
});

async function test(data) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await console.log(data);
}
