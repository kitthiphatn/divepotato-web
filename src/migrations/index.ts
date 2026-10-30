import * as migration_20261027_180301_initial from './20261027_180301_initial';
import * as migration_20261028_074547_home_hero_slides from './20261028_074547_home_hero_slides';
import * as migration_20261028_115304_login_with_username from './20261028_115304_login_with_username';
import * as migration_20261030_141416_site_map_location from './20261030_141416_site_map_location';
import * as migration_20261030_172212_online_payments from './20261030_172212_online_payments';

export const migrations = [
  {
    up: migration_20261027_180301_initial.up,
    down: migration_20261027_180301_initial.down,
    name: '20261027_180301_initial',
  },
  {
    up: migration_20261028_074547_home_hero_slides.up,
    down: migration_20261028_074547_home_hero_slides.down,
    name: '20261028_074547_home_hero_slides',
  },
  {
    up: migration_20261028_115304_login_with_username.up,
    down: migration_20261028_115304_login_with_username.down,
    name: '20261028_115304_login_with_username',
  },
  {
    up: migration_20261030_141416_site_map_location.up,
    down: migration_20261030_141416_site_map_location.down,
    name: '20261030_141416_site_map_location',
  },
  {
    up: migration_20261030_172212_online_payments.up,
    down: migration_20261030_172212_online_payments.down,
    name: '20261030_172212_online_payments'
  },
];
