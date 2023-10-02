# Venue Check

Venue Check prevents double booking venues with The Events Calendar by Modern Tribe.

Requires The Events Calendar (5.3.1 or greater) by Modern Tribe.

**Author**: [Expient](http://expient.com)

**Contributors**: [Expient](http://expient.com), squarecandy

## Status

#### develop
![](https://github.com/squarecandy/venue-check/workflows/WordPress%20Standards/badge.svg?branch=develop&event=push)

#### main
![](https://github.com/squarecandy/venue-check/workflows/WordPress%20Standards/badge.svg)

## WordPress Admins: Installation & FAQ

see https://github.com/squarecandy/venue-check/blob/main/readme.txt

## Developers: Getting Started

* run `npm install` in the plugin directory
* run `grunt` to listen for changes to your scss files and to compile them immediately as you work
* All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) standard.
* always run `grunt preflight` to make sure all linting passes before you commit.

## [Developer Guide](https://developers.squarecandy.net)

For more detailed information about coding standards, development philosophy, how to run linting, how to release a new version, and more, visit the [Square Candy Developer Guide](https://developers.squarecandy.net).

## Filters

* venuecheck_date_format: string (php datetime format) format for conflict date display, default 'n/d/Y'
* venuecheck_time_format: string (php datetime format) format for conflict time display, default 'g:ia'
* venuecheck_compact_time: bool/string false to show 00 in minutes, otherwise string to delete (if minutes are 00), default ':00'
* venuecheck_show_timezone: bool/string false to hide timezone, otherwise format string, default 'T' );
* venuecheck_show_day: bool/string false to hide day name, otherwise format string, default 'D' );
* venuecheck_js_values: array, values to pass in to venuecheck.js, see functions.php
* venuecheck_exclude_venues: bool, whether to look for postmeta 'venuecheck_exclude_venue' to exclude venue from conflicts (e.g. to allow multiple events on "Zoom")
* venuecheck_upcoming_events_meta: array meta to include in the query to get upcoming events