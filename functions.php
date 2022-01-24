<?php
// main plugin file

define( 'VENUE_CHECK_DIR_PATH', plugin_dir_path( __FILE__ ) );
define( 'VENUE_CHECK_URL', plugin_dir_url( __FILE__ ) );

// set up for event edit admin page
require VENUE_CHECK_DIR_PATH . 'inc/event-edit.php';

// set up for event edit admin page
require VENUE_CHECK_DIR_PATH . 'inc/venue-edit.php';

// class for calculating venue conflicts
require VENUE_CHECK_DIR_PATH . '/inc/class-venue-conflicts.php';

function venuecheck_scripts_styles( $hook ) {

	global $post_type;
	$venuecheck_post_types = array( 'tribe_events' );
	if ( venuecheck_exclude_venues() ) {
		$venuecheck_post_types[] = 'tribe_venue';
	}
	if ( ( 'post-new.php' !== $hook && 'post.php' !== $hook ) || ! in_array( $post_type, $venuecheck_post_types ) ) {
		return;
	}

	/* REGISTER JS */
	if ( defined( 'WP_DEBUG' ) ? WP_DEBUG : false ) {
		wp_enqueue_script( 'venuecheck-scripts', VENUE_CHECK_URL . 'js/venue-check.js', array( 'jquery' ), 'version-2.2.4', true );
	} else {
		wp_enqueue_script( 'venuecheck-scripts', VENUE_CHECK_URL . 'dist/js/venue-check.min.js', array( 'jquery' ), 'version-2.2.4', true );
	}

	$localization = array(
		'ajax_url'    => admin_url( 'admin-ajax.php' ),
		'nonce'       => wp_create_nonce( 'venuecheck-nonce' ),
		'plugins_url' => plugin_dir_url( __FILE__ ),
		'debug'       => defined( 'WP_DEBUG' ) ? WP_DEBUG : false,
		'multivenue'  => false,
	);

	if ( class_exists( 'SQC_Multi_Venue' ) && SQC_Multi_Venue::is_enabled() ) {
		$localization['multivenue']  = true;
		$localization['fieldkey']   = SQC_Multi_Venue::get_field_key();
		$localization['field_group'] = SQC_Multi_Venue::get_group_key();
		$localization['container_id'] = '#multi-venue-container';
		$localization['use_tec_fields'] = false; 
		$localization['batchsize'] = 50;
		$localization['recurrence_warning_limit'] = 100;
	}

	$localization = apply_filters( 'venuecheck_js_values', $localization );

	/* LOCALIZE AJAX URL */
	wp_localize_script( 'venuecheck-scripts', 'venuecheck', $localization );

	/* REGISTER CSS */
	wp_enqueue_style( 'venuecheck-styles', VENUE_CHECK_URL . 'dist/css/venue-check.min.css', array(), 'version-2.2.4' );
	wp_enqueue_style( 'fontawesome', '//use.fontawesome.com/releases/v5.2.0/css/all.css', array(), '5.2.0' );

}

add_action( 'admin_enqueue_scripts', 'venuecheck_scripts_styles', 99999 );
add_action( 'wp_ajax_venuecheck_get_event_recurrences', 'venuecheck_get_event_recurrences' );
add_action( 'wp_ajax_venuecheck_check_venues', 'venuecheck_check_venues' );
add_action( 'wp_ajax_venuecheck_progress_bar', 'venuecheck_progress_bar' );

//include hidden events in query
add_filter( 'tribe_events_hide_from_upcoming_ids', 'venuecheck_include_hidden_events' );
function venuecheck_include_hidden_events( $ids ) {
	$ids = array();
	return $ids;
}

// Turn off Gutenberg for Events
// @TODO - create support for the block editor
// for now we're only supporting the classic editor, so force it for the tribe_events post type
add_filter( 'use_block_editor_for_post_type', 'prefix_disable_gutenberg', 20, 2 );
function prefix_disable_gutenberg( $current_status, $post_type ) {
	if ( 'tribe_events' === $post_type ) {
		return false;
	}
	return $current_status;
}


add_filter( 'venuecheck_upcoming_events_meta', 'venue_check_sqc_multi_venue_meta' );
function venue_check_sqc_multi_venue_meta( $meta_pivot ){
	if ( class_exists( 'SQC_Multi_Venue' ) && SQC_Multi_Venue::is_enabled() ) {
		$meta_pivot['multiVenue'] = SQC_Multi_Venue::get_field_name();
	}
	return $meta_pivot;
}


function venuecheck_get_event_recurrences() {

	// Check for nonce security
	if ( ! wp_verify_nonce( $_POST['nonce'], 'venuecheck-nonce' ) ) {
		echo wp_json_encode( array( 'error' => 'error: wordpress nonce security check failed' ) );
		die();
	}

	include 'src/venuecheck_get_recurrence_parameters.php';
	if ( isset( $_POST ) ) {
		$postData = $_POST['post_data'];
	}

	if ( class_exists( 'Tribe__Events__Pro__Recurrence' ) ) {
		parse_str( $postData, $vars );
		$EventAllDay = 'no';
		if ( array_key_exists( 'EventAllDay', $vars ) ) {
			$EventAllDay = $vars['EventAllDay'];
		}
		$event_id              = $vars['post_ID'];
		$startdate             = $vars['EventStartDate'];
		$starttime             = $vars['EventStartTime'];
		$eventTimezone         = $vars['EventTimezone'];
		$eventOffsetStart      = $vars['_venuecheck_event_offset_start'];
		$eventOffsetEnd        = $vars['_venuecheck_event_offset_end'];
		$enddate               = $vars['EventEndDate'];
		$endtime               = $vars['EventEndTime'];
		$duration              = strtotime( "$enddate $endtime" ) - strtotime( "$startdate $starttime" );
		$is_after              = false; // $by_occurrence_count is same as $is_after
		$recurrences           = $vars['recurrence'];
		$possible_next_pending = array();
		$rulesArray            = array();
		$exclusionArray        = array();
		$recurrenceDates       = array();
		$recurrences1          = array( 'rules', 'exclusions' );

		$earliest_date = strtotime( Tribe__Events__Pro__Recurrence__Meta::$scheduler->get_earliest_date() );
		$latest_date   = strtotime( Tribe__Events__Pro__Recurrence__Meta::$scheduler->get_latest_date() );
		foreach ( $recurrences1 as $ruleType ) {
			if ( array_key_exists( $ruleType, $recurrences ) ) {
				foreach ( $recurrences[ $ruleType ] as &$recurrenceRules ) {
					$type = $recurrenceRules['type'];
					/*CIS
					 * Get_recurrence_parameters is a custom function created inside class Tribe__Events__Pro__Recurrence_VenueCheck in the file venuecheck_get_recurrence_parameters.php
					 *    This function is used to create recuuring rules and recuuring exclusions  array in proper format from post data.
					 * This function returns array of start time , duration , end and by-occurrence-count.
					 */
					$recurrence_parameters             = Tribe__Events__Pro__Recurrence_VenueCheck::get_recurrence_parameters( $recurrenceRules, $duration, $enddate, $startdate, $EventAllDay );
					$start_time                        = $recurrence_parameters['start-time'];
					$end                               = (int) $recurrence_parameters['end'];
					$duration                          = $recurrence_parameters['duration'];
					$by_occurrence_count               = $recurrence_parameters['by-occurrence-count'];
					$recurrenceRules['type']           = 'Custom';
					$recurrenceRules['custom']['type'] = $type;
					$recurrenceRules['EventStartDate'] = gmdate( 'Y-m-d H:i:s', strtotime( "$startdate $start_time" ) );
					$recurrenceRules['EventEndDate']   = gmdate( 'Y-m-d H:i:s', strtotime( "$enddate $endtime" ) );
					/*CIS
					 * build_from is used to create an object from recurrence rules and exclusion array
					 */
					$rule = Tribe__Events__Pro__Recurrence__Series_Rules_Factory::instance()->build_from( $recurrenceRules, $ruleType );
					if ( empty( $start_time ) ) {
						$start_time = $starttime;
					}
					if ( isset( $recurrenceRules['custom']['same-time'] ) && 'yes' === $recurrenceRules['custom']['same-time'] && 'yes' === $EventAllDay ) {
						$start_time = '00:00';
					}
					$recurrenceObj = new Tribe__Events__Pro__Recurrence( strtotime( "$startdate $start_time" ), $end, $rule, $by_occurrence_count, $event = null, $start_time, $duration );
					$recurrenceObj->setMinDate( $earliest_date );
					$recurrenceObj->setMaxDate( $latest_date );
					/*CIS
					 *    getDates gives output as dates array of timestamp and duration
					 *    getDates function is existing function of class Tribe__Events__Pro__Recurrence
					 */
					$recurrenceDates[ $ruleType ] = $recurrenceObj->getDates();
					if ( 'rules' === $ruleType ) {
						$rulesArray = array_merge( $rulesArray, $recurrenceDates[ $ruleType ] );
					} else {
						$exclusionArray = array_merge( $exclusionArray, $recurrenceDates[ $ruleType ] );
					}
				}
			}
		}
		$uniqueRules = array();
		foreach ( $rulesArray as $rulearr ) {
			$uniqueRules[ join( '|', $rulearr ) ] = $rulearr;
		}
		/* CIS
		$rulesArray has all recurring rules dates array */
		$rulesArray      = array_values( $uniqueRules );
		$uniqueExclusion = array();
		foreach ( $exclusionArray as $excarr ) {
			$uniqueExclusion[ join( '|', $excarr ) ] = $excarr;
		}
		/* CIS
		$exclusionArray has all recurring exclusion dates array */
		$exclusionArray = array_values( $uniqueExclusion );

		/* CIS
		Remove exclusion dates from recurring rules dates  and get the dates on which event will be held
		 */
		$timezone_string = get_option( 'timezone_string' );
		$removeExcObj    = new Tribe__Events__Pro__Recurrence__Exclusions( $timezone_string );

		/*CIS
		remove_exclusions removes the exclusion dates from $rulesArray dates and get the final dates of event .
		 */
		$to_create = $removeExcObj->remove_exclusions( $rulesArray, $exclusionArray );

		foreach ( $to_create as $key => $value ) {
			$to_create[ $key ]['eventStart']       = gmdate( 'Y-m-d H:i:s', $to_create[ $key ]['timestamp'] );
			$to_create[ $key ]['eventEnd']         = gmdate( 'Y-m-d H:i:s', $to_create[ $key ]['timestamp'] + $to_create[ $key ]['duration'] );
			$to_create[ $key ]['eventTimezone']    = $eventTimezone;
			$to_create[ $key ]['eventOffsetStart'] = $eventOffsetStart;
			$to_create[ $key ]['eventOffsetEnd']   = $eventOffsetEnd;
			unset( $to_create[ $key ]['timestamp'] );
			unset( $to_create[ $key ]['duration'] );
		}
		echo wp_json_encode( $to_create );
		wp_die();
	} else {
		add_action( 'admin_notices', 'events_calendar_pro_not_loaded' );
	}
}


/**
 * Internal function to get upcoming events 
 * so we can check if they overlap with the event being edited
 * @TODO: currently we're getting all events starting after "now"
 * however we should be getting all events ENDING after now to avoid missing long events that have already started
 */
function venuecheck_get_upcoming_events() {

	// Record the start time before the query is executed.
	$started = microtime(true);

	global $wpdb;

	// set which query method to test
	$query_method = '2b';

	error_log('METHOD: ' . $query_method);
	$mem_baseline = print_mem( 'INITIAL' );

	switch ($query_method) {

		case '0':

			// CURRENT METHOD - WP_Query
			$now  = wp_date( 'Y-m-d ' ) . '00:00:01';

			$args = array(
				'post_type'              => 'tribe_events',
				'posts_per_page'         => -1, // @TODO - this is still a danger of overloading the server memory. Should be changed for a paginated ajax recursion that runs until done.
				'post_status'            => array(
					'publish',
					'pending',
					'draft',
					'auto-draft',
					'future',
					'private',
					'inherit',
				),
				'meta_query'             => array(
					array(
						'key'     => '_EventEndDate',
						'value'   => $now,
						'compare' => '>=',
					),
				),
				// make query more efficient - https://10up.github.io/Engineering-Best-Practices/php/
				'no_found_rows'          => true,
				'update_post_term_cache' => false,
				'update_post_meta_cache' => false,

			);

			$upcomingEvents = new WP_Query( $args );

			// log query
			error_log($upcomingEvents->request);

			$upcomingEvents = $upcomingEvents->get_posts();

		break;

		case '1':

			//METHOD 1, sql, only the fields we need, no date check (getting ALL events)
			
			$sql = "SELECT p.ID, p.post_parent, p.post_title, m.meta_key, m.meta_value FROM $wpdb->posts p JOIN $wpdb->postmeta m ON p.ID = m.post_id AND m.meta_key IN ( '_EventTimezone', '_EventStartDate', '_EventEndDate', '_venuecheck_event_offset_start', '_venuecheck_event_offset_end', '_EventVenueID' ) AND p.post_status IN ('publish', 'future', 'draft', 'pending', 'auto-draft' ,'inherit', 'private') AND p.post_type = 'tribe_events'";

			// log query
			error_log($sql);

			$results = $wpdb->get_results( $sql, ARRAY_A );

			$sorted_results = array();
			// this returns an array fo columns, not post objects, we need to loop through the result to turn them into objects
			foreach ( $results as $key => $result ) {
				if ( ! isset( $sorted_results[ $result[ 'ID' ] ] ) ) {
					$sorted_results[ $result[ 'ID' ] ] = (object) [
						'ID' => $result[ 'ID' ],
		            	'post_parent' => $result[ 'post_parent' ],
		            	'post_title' => $result[ 'post_title' ],
		            	$result[ 'meta_key' ] => $result[ 'meta_value' ],
					];
				} else {
					$sorted_results[ $result[ 'ID' ] ]->{$result[ 'meta_key' ]} = $result[ 'meta_value' ];
				}         
			}

			$upcomingEvents = $sorted_results;			

		break;

		case '1b':

			//METHOD 1b, sql, only the fields we need, with date check
			$now  = wp_date( 'Y-m-d ' ) . '00:00:01';
			$sql = "SELECT p.ID, p.post_parent, p.post_title, m1.meta_value _EventStartDate, m.meta_key, m.meta_value FROM $wpdb->posts p JOIN $wpdb->postmeta m1 ON p.ID = m1.post_id AND m1.meta_key = '_EventStartDate' AND m1.meta_value >= '$now' JOIN $wpdb->postmeta m ON p.ID = m.post_id AND m.meta_key IN ( '_EventTimezone', '_EventEndDate', '_venuecheck_event_offset_start', '_venuecheck_event_offset_end', '_EventVenueID' ) AND p.post_status IN ('publish', 'future', 'draft', 'pending', 'auto-draft' ,'inherit', 'private') AND p.post_type = 'tribe_events'";

			// log query
			error_log($sql);
			$results = $wpdb->get_results( $sql, ARRAY_A );

			// process results array
			$sorted_results = array();
			foreach ( $results as $key => $result ) {
				if ( ! isset( $sorted_results[ $result[ 'ID' ] ] ) ) {
					$sorted_results[ $result[ 'ID' ] ] = (object) [
						'ID' => $result[ 'ID' ],
		            	'post_parent' => $result[ 'post_parent' ],
		            	'post_title' => $result[ 'post_title' ],
		            	'_EventStartDate' => $result[ '_EventStartDate' ],
		            	$result[ 'meta_key' ] => $result[ 'meta_value' ],
					];
				} else {
					$sorted_results[ $result[ 'ID' ] ]->{$result[ 'meta_key' ]} = $result[ 'meta_value' ];
				}         
			}

			$upcomingEvents = $sorted_results;			

		break;

		case '2':
	
			//METHOD 2, sql, use mysql pivot technique to ouput an object with the postmeta we need, no date check
			$pivot_meta = array( '_EventTimezone', '_EventStartDate', '_EventEndDate', '_venuecheck_event_offset_start', '_venuecheck_event_offset_end', '_EventVenueID' );
			$pivot_meta_case = array();
			foreach ($pivot_meta as $key => $meta_key) {
				$pivot_meta_case[] = "MAX(CASE WHEN m.meta_key='$meta_key' then m.meta_value end) $meta_key";
			}
			$pivot_meta = implode( "', '", $pivot_meta );
			$pivot_meta_case = implode( ', ', $pivot_meta_case );
			$pivot_sql = "SELECT p.ID, p.post_parent, p.post_title, $pivot_meta_case FROM $wpdb->posts p JOIN $wpdb->postmeta m ON p.ID = m.post_id AND m.meta_key IN ( '$pivot_meta' ) WHERE p.post_type = 'tribe_events' AND p.post_status IN ('publish', 'future', 'draft', 'pending', 'auto-draft' ,'inherit', 'private') group by ID";

			// log query
			error_log($pivot_sql);

			$pivot_results = $wpdb->get_results( $pivot_sql, OBJECT );
			$upcomingEvents = $pivot_results;			

		break;

		case '2b':

			//METHOD 2b, sql, use mysql pivot technique to ouput an object with the postmeta we need, withdate check

			$now  = wp_date( 'Y-m-d ' ) . '00:00:01';
			$pivot_meta = array( 
				// column name                   => meta_key
				'_EventTimezone'                 => '_EventTimezone',
				'_EventStartDate'                => '_EventStartDate',
				'_EventEndDate'                  => '_EventEndDate',
				'_venuecheck_event_offset_start' => '_venuecheck_event_offset_start',
				'_venuecheck_event_offset_end'   => '_venuecheck_event_offset_end',
				'_EventVenueID'                  => '_EventVenueID',
				'multiVenue'                     => 'multiVenue',
			);

			$pivot_meta = apply_filters( 'venuecheck_upcoming_events_meta', $pivot_meta );
			$pivot_meta_case = array();
			foreach ($pivot_meta as $key => $meta_key) {
				$pivot_meta_case[] = "MAX(CASE WHEN m.meta_key='$meta_key' then m.meta_value end) $key";
			}
			$pivot_meta = implode( "', '", array_values( $pivot_meta ) );
			$pivot_meta_case = implode( ', ', $pivot_meta_case );
			$pivot_sql = "SELECT p.ID, p.post_parent, p.post_title, q.* FROM $wpdb->posts p JOIN ( SELECT m.post_id, $pivot_meta_case FROM $wpdb->postmeta m WHERE m.meta_key IN ( '$pivot_meta' )  GROUP by post_id ) q ON p.ID = q.post_id AND p.post_type = 'tribe_events' AND p.post_status IN ('publish', 'future', 'draft', 'pending', 'auto-draft' ,'inherit', 'private') AND q._EventStartDate >= '$now'";

			// log query
			error_log($pivot_sql);

			$pivot_results = $wpdb->get_results( $pivot_sql, OBJECT );
			$upcomingEvents = $pivot_results;

		break;

		case '3':

			//METHOD 3, sql, store our data in a new table

			$now  = wp_date( 'Y-m-d ' ) . '00:00:01';
			$sql = "SELECT p.post_parent, p.post_title, v.* FROM $wpdb->posts p JOIN {$wpdb->prefix}vc_events v ON p.ID = v.ID AND v._EventStartDate >= '$now'";
			error_log($sql);
			$pivot_results = $wpdb->get_results( $sql, OBJECT );
			error_log(print_r($pivot_results,true));
			$upcomingEvents = $pivot_results;

		break;
	}

	//Record the end time after the query has finished running.
	$end = microtime(true);

	//Calculate the difference in microseconds.
	$difference = $end - $started;

	//Format the time so that it only shows 10 decimal places.
	$queryTime = number_format($difference, 10);

	//Print out the seconds it took for the query to execute.
	print_mem( 'POST QUERY', $mem_baseline );
	error_log( "SQL: $queryTime seconds. Returned " . count($upcomingEvents) . ' rows.');

	//end events query
	return $upcomingEvents;

}


/**
 * Calculate the padded start & end times for an event
 *
 * @param array|object $event with start/end date and start/end offset
 * @param string $imezone
 * @return array|false False on failure.
 *      $OffsetStart DateTime object
 *      $OffsetStart DateTime object                    
 */
function venuecheck_get_offset_dates( $event, $timezone ) {

	if ( is_object( $event ) ) {
		$start_date   = $event->_EventStartDate;
		$end_date     = $event->_EventEndDate;
		$offset_start = $event->_venuecheck_event_offset_start;
		$offset_end   = $event->_venuecheck_event_offset_end;
	} elseif ( is_array( $event ) ) {
		$start_date        = $event['eventStart'];
		$end_date          = $event['eventEnd'];
		$offset_start = $event['eventOffsetStart'];
		$offset_end   = $event['eventOffsetEnd'];
	} else {
		return;
	}

	$start = new DateTime( $start_date, new DateTimeZone( $timezone ) );
	$end   = new DateTime( $end_date, new DateTimeZone( $timezone ) );

	// subtract offset from start (a.k.a "setup time")
	if ( ! empty( $offset_start ) ) {
		$eventOffsetStart = 'PT' . $offset_start . 'M';
		$start->sub( new DateInterval( $eventOffsetStart ) );
	}
	// add offset to end (a.k.a. "cleanup time")
	if ( ! empty( $offset_end ) ) {
		$eventOffsetEnd = 'PT' . $offset_end . 'M';
		$end->add( new DateInterval( $eventOffsetEnd ) );
	}

	$offset_array = array(
		'OffsetStart' => $start,
		'OffsetEnd'   => $end,
	);

	return $offset_array;

}

function venuecheck_check_venues() {

	// Check for nonce security
	if ( ! wp_verify_nonce( $_POST['nonce'], 'venuecheck-nonce' ) ) {
		echo wp_json_encode( array( 'error' => 'error: wordpress nonce security check failed - ' . $_POST['nonce'] ) );
		die();
	}

	//$upcomingEvents = venuecheck_get_upcoming_events();
	$upcomingEvents = get_cached_upcoming_events();
	//end events query

	if ( WP_DEBUG ) {
		error_log( '**************************************************************************' );
		error_log( 'Venue Check upcoming events: ' . count( $upcomingEvents ) );
	}

	$venuecheck_conflicts = new Venue_Conflicts;

	$defaultTimezone = get_option( 'timezone_string' );

	//event confict checking

	if ( isset( $_POST ) ) {

		/*
		 * CONFLICT: (StartA < EndB) and (EndA > StartB)
		 *
		 * A conflict occurs if:
		 * the start of the new event is before the end of the existing event
		 * AND the end of the new event is after the start of the existing event
		 *
		 * This accounts for overlaps at the beginning of the existing event; overlaps at the end of the existing event; complete overlap.
		 *
		 * data format:
		 * {eventStart: "2018-05-14 8:00:00", eventEnd: "2018-05-14 17:00:00", eventTimezone: "America/New_York", eventOffsetStart: "0", eventOffsetEnd: "0"}
		 */

		// new event dates

		$event_recurrences = $_POST['event_recurrences'];
		$postID            = $_POST['postID'];
		$total_count       = $_POST['total_count'];
		$batch_size        = $_POST['batch_size'];
		$batch_count       = $_POST['batch_count'];
		$loop_count        = 0;

		if ( WP_DEBUG ) {
			error_log( '* Venue Check event recurrences for post id ' . $postID . ': ' . $total_count );
			error_log( '* Venue Check batch: ' . $batch_count . ' of ' . $batch_size );
		}

		foreach ( $event_recurrences as $k => $event_recurrence ) {
			$loop_count++;
			$current_count = ( $batch_count * $batch_size ) + $loop_count;
			$timezone      = $event_recurrence['eventTimezone'];

			$offsetDatesA = venuecheck_get_offset_dates( $event_recurrence, $timezone );
			$startA       = $offsetDatesA['OffsetStart'];
			$endA         = $offsetDatesA['OffsetEnd'];

			if ( WP_DEBUG ) {
				error_log( '*********************************' );
				error_log( '* * Venue Check event recurrence: ' . $event_recurrence['eventStart'] . ' to ' . $event_recurrence['eventEnd'] );
			}

			//upcoming event dates
			foreach ( $upcomingEvents as $k => $upcomingEvent ) {
				if ( ! empty( $upcomingEvent->_EventTimezone ) ) {
					$timezone = $upcomingEvent->_EventTimezone;
				} else {
					$timezone = $defaultTimezone;
				}

				$offsetDatesB = venuecheck_get_offset_dates( $upcomingEvent, $timezone );
				$startB       = $offsetDatesB['OffsetStart'];
				$endB         = $offsetDatesB['OffsetEnd'];

				// compare dates to find conflicts
				if ( $startA < $endB && $endA > $startB ) {

					if ( WP_DEBUG ) {
						error_log( '* * * * * ' . $upcomingEvent->ID . ': ' . $upcomingEvent->_EventStartDate  . ' to ' . $upcomingEvent->_EventEndDate );
					}

					// check that the upcoming event isn't our event, or a recurrence of our event
					if ( $upcomingEvent->ID != $postID && $upcomingEvent->post_parent != $postID ) {

						if ( WP_DEBUG ) {
							error_log( '* * * * * MULTIVENUE ' . $upcomingEvent->multiVenue );
							error_log( print_r( maybe_unserialize( $upcomingEvent->multiVenue ),true) );
						}

						$venues = $upcomingEvent->multiVenue ? maybe_unserialize( $upcomingEvent->multiVenue ) : array( $upcomingEvent->_EventVenueID );

						foreach ( $venues as $venue_id ) {
							$EventVenueID = (int) $venue_id;
							$venuecheck_conflicts->add_venue( $upcomingEvent, $startB, $endB, $EventVenueID );
						}
		
					}
				}
			} //end foreach $upcomingEvents
		} //end foreach $event_recurrences

		$venuecheck_conflicts->filter();

		if ( WP_DEBUG ) {
			error_log( '* Venuecheck batch done.' );
			error_log( '**************************************************************************' );
			error_log( '**************************************************************************' );
			error_log( print_r($venuecheck_conflicts,true) );
		}

		echo wp_json_encode( $venuecheck_conflicts->conflicts );
	}
	wp_die();
}


// make sure not to try to grab the WPORG version
add_filter( 'gu_override_dot_org', 'venue_check_gu_override_dot_org' );
function venue_check_gu_override_dot_org() {
	return array( 'venue-check/plugin.php' );
}


function get_cached_upcoming_events(){
	// Record the start time before the query is executed.
	$started = microtime(true);
	$mem_baseline = print_mem( 'PRE CACHE CHECK' );

	$cache    = tribe( 'cache' );
	$u_events = $cache->get_transient( 'venue_check_upcoming_events', 'save_post' );
	if ( is_array( $u_events ) ) {
		error_log('USING CACHE');
		//Print out the seconds it took for the query to execute.
		print_mem( 'POST QUERY', $mem_baseline );	//Record the end time after the query has finished running.
		$end = microtime(true);

		//Calculate the difference in microseconds.
		$difference = $end - $started;

		//Format the time so that it only shows 10 decimal places.
		$queryTime = number_format($difference, 10);
		error_log( "SQL: $queryTime seconds. Returned " . count($u_events) . ' rows.');
		return $u_events;
	} 

	$u_events = venuecheck_get_upcoming_events();
	error_log('SETTING CACHE');
	$cache->set_transient( 'venue_check_upcoming_events', $u_events, Tribe__Cache::NO_EXPIRATION, 'save_post' );
	error_log(print_r($cache->get_transient( 'venue_check_upcoming_events', 'save_post' ),true));


	return $u_events;
}


function print_mem( $message, $compare = array() ) {
	/* Currently used memory */
	$mem_usage = memory_get_usage();
	$mem_usage_real = memory_get_usage(true);

	/* Peak memory usage */
	$mem_peak = memory_get_peak_usage();
	$output = $message . ': ';
	//$output .= round($mem_usage/1024/1024) .  'MiB (used) / ' . round($mem_usage_real/1024/1024) . 'MiB (allocated) ';
	
	$values = array (
		'real' => $mem_usage_real,
		'used' => $mem_usage,
	);
	$output .= 'initial: ' . round($mem_usage/1024/1024,2) .  ' MiB (used) / ' . round($mem_usage_real/1024/1024,2) . ' MiB (allocated) ';
	if ( $compare && isset( $compare['real'] ) && isset($compare['used'] ) ) {
		$values['real_diff'] = $mem_usage_real - $compare['real'];
		$values['used_diff'] = $mem_usage - $compare['used'];
		$output .= 'diff: ' . round($values['used_diff']/1024/1024,2) .  ' MiB (used) / ' . round($values['real_diff']/1024/1024,2) . ' MiB (allocated) ';
	} else {
		//$output .= 'initial: ' . round($mem_usage/1024/1024) .  'MiB (used) / ' . round($mem_usage_real/1024/1024) . 'MiB (allocated) ';
	}
	$output .= ' Peak: ' . round($mem_peak /1024/1024,2) . ' MiB';
	error_log($output);
	return $values;
}


function venuecheck_exclude_venues(){
	error_log( 'exclude_venues ' . apply_filters( 'venuecheck_exclude_venues', false ) );
	return apply_filters( 'venuecheck_exclude_venues', false );
}

function venuecheck_is_excluded_venue( $venue_id ) {
	error_log( 'is_excluded_venue ' . $venue_id . get_the_title( $venue_id ) . '? ' . get_post_meta( $venue_id, 'venuecheck_exclude_venue', true ) );
	return get_post_meta( $venue_id, 'venuecheck_exclude_venue', true );
}

//turn on exclusions
add_filter( 'venuecheck_exclude_venues', function(){ return true; } );
