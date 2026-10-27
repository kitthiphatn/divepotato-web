import * as migration_20261027_180301_initial from './20261027_180301_initial';

export const migrations = [
  {
    up: migration_20261027_180301_initial.up,
    down: migration_20261027_180301_initial.down,
    name: '20261027_180301_initial'
  },
];
