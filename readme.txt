=== Plugin Name ===
Contributors: Expient
Donate link: http://expient.com
Tags: the events calendar, venue, conflicts, double booking
Requires at least: 5.6
Tested up to: 5.6.8
Stable tag: 2.3.1-dev.1
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Venue Check prevents double booking venues with The Events Calendar by Modern Tribe.

== Description ==

Venue Check will check for venue conflicts when adding an event. You can also include setup and cleanup time before and after the event. The setup and cleanup time will not display on the events calendar but will be included into the venue conflict checking.

Requires The Events Calendar (5.3.1 or greater) by Modern Tribe.

This plugin will work with "The Events Calendar" or "The Events Calendar PRO" and supports the recurring events feature available in the PRO version.

I hope you find this plugin useful. If you find any bugs or have any feedback of any kind, please contact me.

[youtube https://www.youtube.com/watch?v=2lcYXwTMJo4]

== Installation ==

1. Upload the `venue-check` plugin to your `/wp-content/plugins` directory, or upload and install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Please note that when deleting the plugin any `setup` and `cleanup` times you added with the Venue Check plugin will not be deleted from the database.
4. The plugin does not have any settings. It adds functionality when adding an event with "The Events Calendar" admin. Look for the setup time and cleanup time controls in the Date & Time section when adding a new event (see the screenshots for an example).

== Frequently Asked Questions ==

= How does Venue Check work? =

Venue Check gets all your future, upcoming events and compares the dates and times with the event you are creating. If it finds any conflicts, it disables the venue in the venue selection dropdown menu. It also provides a report of all the conflicts which may be useful for rescheduling your events to accommodate all your events.

= How do I know if the plugin has been installed? =

You can see "with Venue Check" on the admin screen Date and Time section when adding or editing an event.

= After I insall it for the first time, what happens if I already have venue conflicts? Does it check for existing conflicts? =

After you install and activate Venue Check, you will need to open pre-existing events and click "change venue" to initiate a check for available venues. After Venue Check is finished, you can select an available venue from the dropdown menu.

= Does Venue Check work with recurring events? =

Yes. Venue Check will find venue conflicts with all future upcoming events.

= How come my long recurrence series doesn't have as many recurrences as I expected? =

In The Events Calendar settings you can control how far in the future to create recurring events. For example, if you created a "never ending" recurring event, Venue Check will check for conflicts up until the number of months you've specified in your Events Calendar settings.

= What happens to the setup/cleanup time if I deactivate and delete Venue Check. =

The setup/cleanup time will remain in the database with the event metadata. If you decide to reactivate Venue Check, you can continue using the setup/cleanup time you had previously saved.

== Screenshots ==

1. This is a screenshot that shows the Date & Time section with the Venue Check indicator and the Setup and Cleanup times. It also shows an existing conflict for the Venue dropdown menu.

2. This is a screenshot that shows the unavailability of `Conference Room 1` in the Venue dropdown menu.

== Changelog ==
