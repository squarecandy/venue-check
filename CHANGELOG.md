# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.3.0-rc2](https://github.com/squarecandy/venue-check/compare/v2.3.0-rc1...v2.3.0-rc2) (2022-02-15)


### Bug Fixes

* Firefox Win input changes not registering ([27374a5](https://github.com/squarecandy/venue-check/commit/27374a5c4e44c0696785acf0b82d71570a44d73d))

## [2.3.0-rc2](https://github.com/squarecandy/venue-check/compare/v2.3.0-rc1...v2.3.0-rc2) (2022-02-15)

## [2.3.0-rc1](https://github.com/squarecandy/venue-check/compare/v2.2.4...v2.3.0-RC1) (2022-02-15)

### Features

* Support Multi-Venue checking
* Major Performance enhancements (query only for the required data)

### Bug Fixes

* add message when deselecting venues ([2f6f8d5](https://github.com/squarecandy/venue-check/commit/2f6f8d5be4b854bdafb7d9faa42d80376151c156))
* batchsize & warning always need to be set ([15a0431](https://github.com/squarecandy/venue-check/commit/15a043180384dd043a2a0b11fec8df4ec747e7c8))
* change empty link elements to buttons ([6c806bb](https://github.com/squarecandy/venue-check/commit/6c806bb102d405fd5c0e20897367fa430e810bec))
* change style & text of deselected warning ([25647a8](https://github.com/squarecandy/venue-check/commit/25647a8f03aacafa38fb6057bed9fb02f5e98aba))
* clean up logging ([9387799](https://github.com/squarecandy/venue-check/commit/9387799b4524f36d2e77d5a8a2403a130a706789))
* disable save draft as well as publish ([afed911](https://github.com/squarecandy/venue-check/commit/afed9110f1ed1c427c3e07a9fc25a8c16c96e9c0))
* don't disable excluded venues ([6f99cf5](https://github.com/squarecandy/venue-check/commit/6f99cf55d5998fb9e6d316adef2a33f19910e191))
* don't show recurrence indicator on singletons ([38c4402](https://github.com/squarecandy/venue-check/commit/38c44020caa82363e783d54061411b39fe3df45a))
* for now override inconsistent TEC tabindexes ([68df9d5](https://github.com/squarecandy/venue-check/commit/68df9d569786a800e369dd7959f486cabe32be32))
* hide exclusions report ([9040d97](https://github.com/squarecandy/venue-check/commit/9040d97fcabd7109fd019855b23d8741d3aad37b))
* increase warning limit & fix batchsize NaN bug ([2698cf5](https://github.com/squarecandy/venue-check/commit/2698cf5d45d3bccd928d7f3d80535992c31aac72))
* jquery migrate errors ([1b9bb4a](https://github.com/squarecandy/venue-check/commit/1b9bb4a96675a7cf33d2ff2bf445790d5ee04363))
* js bug ([09b6652](https://github.com/squarecandy/venue-check/commit/09b6652baecf30e43d4a459ea4ed0e612f6cd9a8))
* really deselect options ([0f8379f](https://github.com/squarecandy/venue-check/commit/0f8379f49c5647e5464930eb5c3f4e6310914de5))
* really hide exclusions form ([8f9760f](https://github.com/squarecandy/venue-check/commit/8f9760f484165025e04c55b07d60a522f9eb32f0))
* recheck recurrences if date changes, don't delete venue edit link ([60e98ca](https://github.com/squarecandy/venue-check/commit/60e98ca17e4c2778e04295452d5052faef353e45))
* report count bug & select2 issues ([140ef87](https://github.com/squarecandy/venue-check/commit/140ef87f6678fe9e1147fe28d8d1dae525326637))
* save updated form state ([9effb32](https://github.com/squarecandy/venue-check/commit/9effb32e9c19a01f962d50c3be293492ed6fe07b))
* shift removal of "my venues" section to php ([8fbd339](https://github.com/squarecandy/venue-check/commit/8fbd3392493ab144256f913ed9f62536ec04cdb5))
* show "find available venues" on existing events with no venue, make it tabbable ([f5eb19f](https://github.com/squarecandy/venue-check/commit/f5eb19f0b1873b363fe69c65558e8899afccc739))
* sort order of ACF venue dropdown ([8f894f6](https://github.com/squarecandy/venue-check/commit/8f894f64ad141e6a496e7d5ec64f1cc479cb7913))
* truncate display of long recurrence patterns ([5653556](https://github.com/squarecandy/venue-check/commit/5653556205e06950d68e0585f25ff60c7bc8ef19))

### [2.2.4](https://github.com/squarecandy/venue-check/compare/v2.2.3...v2.2.4) (2021-10-27)


### Bug Fixes

* make future events query more efficient to avoid php memory errors ([774531a](https://github.com/squarecandy/venue-check/commit/774531a2245aa2ec0a68b27364d5e94daa06fdda))

### [2.2.3](https://github.com/squarecandy/venue-check/compare/v2.2.2...v2.2.3) (2021-06-24)


### Bug Fixes

* ignore the WPORG version with the same slug ([29e7f92](https://github.com/squarecandy/venue-check/commit/29e7f92c467e9c258386f575914e4b88f5dd2752))
* venue field customization not load in firefox ([7f42415](https://github.com/squarecandy/venue-check/commit/7f4241539cd816ddd2f67076fa80d0075eaf62e7))

### [2.2.2](https://github.com/squarecandy/venue-check/compare/v2.2.1...v2.2.2) (2021-05-28)


### Bug Fixes

* git-updater primary branch header ([2d5469b](https://github.com/squarecandy/venue-check/commit/2d5469b2185334d9fee31b92bde95aabc8023a72))

### [2.2.1](https://github.com/squarecandy/venue-check/compare/v2.2.0...v2.2.1) (2021-05-13)


### Bug Fixes

* unselect new conflicts that are already selected, reenable items that are no longer conflicts after date/time change ([73ebc0c](https://github.com/squarecandy/venue-check/commit/73ebc0cfbc813c701567da210ad23b3113925782))

## [2.2.0](https://github.com/squarecandy/venue-check/compare/v2.2.0-rc5...v2.2.0) (2021-05-04)


### Bug Fixes

* resaving event without changing venue can delete venue value ([6ddce00](https://github.com/squarecandy/venue-check/commit/6ddce0090b289b2c9e12e2b72379ceb45f3d9fdd))

## [2.2.0-rc5](https://github.com/squarecandy/venue-check/compare/v2.2.0-rc4...v2.2.0-rc5) (2021-04-12)

## [2.2.0-rc4](https://github.com/squarecandy/venue-check/compare/v2.2.0-rc3...v2.2.0-rc4) (2021-04-08)


### Bug Fixes

* add more classes to html ([4036f2a](https://github.com/squarecandy/venue-check/commit/4036f2a5aa606edc9a78bed234678b4bf9eb6dfa))
* check for events today ([1d0f143](https://github.com/squarecandy/venue-check/commit/1d0f143cfe5872c1190cbec47d3e931777a61ffc))
* show details broken on firefox; refactor jQuery that adds extra markup ([2cf8f7a](https://github.com/squarecandy/venue-check/commit/2cf8f7ac221b7c6ae25d0669a072eef300873389))
* warning near publish button was squished ([f286925](https://github.com/squarecandy/venue-check/commit/f286925b7d73484394ff293367ded08e58910179))

## [2.2.0-rc3](https://github.com/squarecandy/venue-check/compare/v2.2.0-rc2...v2.2.0-rc3) (2021-04-07)


### Bug Fixes

* add nonce security to all ajax calls ([1628700](https://github.com/squarecandy/venue-check/commit/162870026c8879271af48910e65015d6292c4e0b))
* force classic editor for now ([c1848b3](https://github.com/squarecandy/venue-check/commit/c1848b3ca357c3e4eac59dac7c276da1089c7bde))
* more nonce checking ([0181685](https://github.com/squarecandy/venue-check/commit/0181685b7063dc7be9deb880ef3d1277685e85f9))
* update timezone and start/endtime handling ([9a794ff](https://github.com/squarecandy/venue-check/commit/9a794ffe6333e248b160026af70774c974d66dd1))

## [2.2.0-rc2](https://github.com/squarecandy/venue-check/compare/v2.2.0-rc1...v2.2.0-rc2) (2021-01-19)


### Bug Fixes

* GitHub updater compat; better readme ([729f931](https://github.com/squarecandy/venue-check/commit/729f931d5268a9131c089c1ffa0677af149a9f23))

## 2.2.0-rc1 (2021-01-18)


### Features

* make "change venue" into a button; hide the edit venue link (confusing UI) ([2f9cc3e](https://github.com/squarecandy/venue-check/commit/2f9cc3e625bef40df72de7a1558d3750bda7f6b3))
* remove the confusing double list from Modern Tribe ("My Venues" vs "Available Venues") ([f70981b](https://github.com/squarecandy/venue-check/commit/f70981bfea12effd0b3e069ff3701519e1e7ae06))


### Bug Fixes

* add warning about 2 year max on future recurring ([d85ca15](https://github.com/squarecandy/venue-check/commit/d85ca150b8aab48564a446975c2d87c2379b0474))
* additional log messages for debugging ([6d4ec85](https://github.com/squarecandy/venue-check/commit/6d4ec853dacfdc3cd708b988c1729ba8a42c9a59))
* error handling for bad or empty input in convert to time function ([a2539a1](https://github.com/squarecandy/venue-check/commit/a2539a129a3e44cfe2b268564e34a22a96cd6495))
* js debug logging only if WP_DEBUG is on ([776b2cc](https://github.com/squarecandy/venue-check/commit/776b2ccfa2123d9a6f58735eaf1e1ebf4e223f2b))
* make UI for disabled elements different from selected, strikethru ([74d8896](https://github.com/squarecandy/venue-check/commit/74d8896cfa10202dc86fb9f6c0848b12d5b006d7))
* rename class extension ([25d3ae6](https://github.com/squarecandy/venue-check/commit/25d3ae613aabef19940614c7e2c82269dc6a0093))
* revert to using date() for now ([32b8ad1](https://github.com/squarecandy/venue-check/commit/32b8ad145383f50dee6cf21fa3302825a3c6e002))
* update for compatibility with Select2 4.x ([a30da29](https://github.com/squarecandy/venue-check/commit/a30da296b4caeb29cefe891af152b5a7b68cc4b3))
* use compressed js file ([1a47c54](https://github.com/squarecandy/venue-check/commit/1a47c5447771727fe814519626a3e822fa74a901))
* use gmdate() instead of date() or wp_date() to handle expected UTC timestamp dates ([0a6c8ed](https://github.com/squarecandy/venue-check/commit/0a6c8ed703da5761a4ea6bf16705d935787e1d62))
