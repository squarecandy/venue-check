<?php
// main plugin file

define( 'VENUE_CHECK_DIR_PATH', plugin_dir_path( __FILE__ ) );
define( 'VENUE_CHECK_URL', plugin_dir_url( __FILE__ ) );


function venuecheck_scripts_styles( $hook ) {
	global $post_type;
	if ( ( 'post-new.php' !== $hook && 'post.php' !== $hook ) || 'tribe_events' !== $post_type ) {
		return;
	}

	/* REGISTER JS */
	if ( defined( 'WP_DEBUG' ) ? WP_DEBUG : false ) {
		wp_enqueue_script( 'venuecheck-scripts', VENUE_CHECK_URL . 'js/venue-check.js', array( 'jquery' ), 'version-2.2.4', true );
	} else {
		wp_enqueue_script( 'venuecheck-scripts', VENUE_CHECK_URL . 'dist/js/venue-check.min.js', array( 'jquery' ), 'version-2.2.4', true );
	}

	/* LOCALIZE AJAX URL */
	wp_localize_script(
		'venuecheck-scripts',
		'venuecheck',
		array(
			'ajax_url'    => admin_url( 'admin-ajax.php' ),
			'nonce'       => wp_create_nonce( 'venuecheck-nonce' ),
			'plugins_url' => plugin_dir_url( __FILE__ ),
			'debug'       => defined( 'WP_DEBUG' ) ? WP_DEBUG : false,
		)
	);

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
			$pivot_meta = array( '_EventTimezone', '_EventStartDate', '_EventEndDate', '_venuecheck_event_offset_start', '_venuecheck_event_offset_end', '_EventVenueID' );
			$pivot_meta_case = array();
			foreach ($pivot_meta as $key => $meta_key) {
				$pivot_meta_case[] = "MAX(CASE WHEN m.meta_key='$meta_key' then m.meta_value end) $meta_key";
			}
			$pivot_meta = implode( "', '", $pivot_meta );
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

	$upcomingEvents = venuecheck_get_upcoming_events();
	//end events query

	if ( WP_DEBUG ) {
		error_log( '**************************************************************************' );
		error_log( 'Venue Check upcoming events: ' . count( $upcomingEvents ) );
	}

	$venuecheck_conflicts = array();

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

				if ( WP_DEBUG ) {
					error_log( '* * * * * ' . $upcomingEvent->ID . ': ' . $upcomingEvent->_EventStartDate  . ' to ' . $upcomingEvent->_EventEndDate );
				}

				// compare dates to find conflicts
				if ( $startA < $endB && $endA > $startB ) {

					// check that the upcoming event isn't our event, or a recurrence of our event
					if ( $upcomingEvent->ID != $postID && $upcomingEvent->post_parent != $postID ) {

						$EventVenueID             = (int) $upcomingEvent->_EventVenueID;
						$EventVenueTitle          = get_the_title( $EventVenueID );

						$venuecheck_eventDisplay  = $startB->format( 'm/d/Y g:i a' );
						$venuecheck_eventDisplay .= ' &ndash; ';
						$venuecheck_eventDisplay .= $endB->format( 'g:i a m/d/Y T' );
						
						if ( $EventVenueTitle ) {
							// add id & title to index for the venue id ( it may already exist, but id/title shouldn't change, so that's ok )
							$venuecheck_conflicts[ $EventVenueID ]['venueID']    = $EventVenueID;
							$venuecheck_conflicts[ $EventVenueID ]['venueTitle'] = $EventVenueTitle;

							// add this event to an array of events for this venue
							$venuecheck_conflicts[ $EventVenueID ]['events'][]   = array(
								'eventLink'  => get_edit_post_link( $upcomingEvent->ID ),
								'eventTitle' => $upcomingEvent->post_title,
								'eventDate'  => $venuecheck_eventDisplay,
							);
						}
						// if we've added to the array of events, or it already exists, filter out duplicates ( we might have flagged them as conflicting with an earlier recurrence? )
						if ( isset( $venuecheck_conflicts[ $EventVenueID ]['events'] ) ) {
							$venuecheck_conflicts[ $EventVenueID ]['events'] = array_unique( $venuecheck_conflicts[ $EventVenueID ]['events'], SORT_REGULAR );
						}						
					}
				}
			} //end foreach $upcomingEvents
		} //end foreach $event_recurrences
		$venuecheck_conflicts = array_map( 'array_filter', $venuecheck_conflicts ); //remove empty array elements
		$venuecheck_conflicts = array_filter( $venuecheck_conflicts ); //remove empty array elements
		//sort by venue title
		if ( ! empty( $venuecheck_conflicts ) ) {
			usort(
				$venuecheck_conflicts,
				function ( $a, $b ) {
					return strcmp( strtolower( $a['venueTitle'] ), strtolower( $b['venueTitle'] ) );
				}
			);
		}

		if ( WP_DEBUG ) {
			error_log( '* Venuecheck batch done.' );
			error_log( '**************************************************************************' );
		}

		echo wp_json_encode( $venuecheck_conflicts );
	}
	wp_die();
}

//append html section for offset controls
add_action( 'tribe_events_date_display', 'venuecheck_offsets_html' );
function venuecheck_offsets_html() {

	global $post;
	$post_id = $post->ID;
	$screen  = get_current_screen();

	if ( 'add' === $screen->action || ! $post_id ) {
		$eventOffsetStart = 0;
		$eventOffsetEnd   = 0;
	} else {
		$eventOffsetStart = get_post_meta( $post_id, '_venuecheck_event_offset_start', true );
		$eventOffsetEnd   = get_post_meta( $post_id, '_venuecheck_event_offset_end', true );
	}
	?>

	<table id="venuecheck-offsets">
		<colgroup>
			<col style="width:15%">
				<col style="width:85%">
		</colgroup>
		<tbody class="venuecheck-section tribe-datetime-block">
			<tr class="venue-check-title-bar">
				<td colspan="2" class="venuecheck-section-label">Venue Check</td>
			</tr>
			<tr class="setup-time">
				<td class="venuecheck-label">Setup Time:</td>
				<td class="venuecheck-block">
				<input type="hidden" name="venuecheck_meta_nonce" value="<?php echo wp_create_nonce( 'venuecheck-meta-nonce' ); ?>">

					<select tabindex="2003" name="_venuecheck_event_offset_start" id="_venuecheck_event_offset_start">
						<option value="0" <?php selected( $eventOffsetStart, '0' ); ?>>None</option>
						<option value="15" <?php selected( $eventOffsetStart, '15' ); ?>>15 minutes</option>
						<option value="30" <?php selected( $eventOffsetStart, '30' ); ?>>30 minutes</option>
						<option value="45" <?php selected( $eventOffsetStart, '45' ); ?>>45 minutes</option>
						<option value="60" <?php selected( $eventOffsetStart, '60' ); ?>>1 hour</option>
						<option value="120" <?php selected( $eventOffsetStart, '120' ); ?>>2 hours</option>
						<option value="180" <?php selected( $eventOffsetStart, '180' ); ?>>3 hours</option>
						<option value="240" <?php selected( $eventOffsetStart, '240' ); ?>>4 hours</option>
						<option value="300" <?php selected( $eventOffsetStart, '300' ); ?>>5 hours</option>
						<option value="360" <?php selected( $eventOffsetStart, '360' ); ?>>6 hours</option>
						<option value="420" <?php selected( $eventOffsetStart, '420' ); ?>>7 hours</option>
						<option value="480" <?php selected( $eventOffsetStart, '480' ); ?>>8 hours</option>
						<option value="540" <?php selected( $eventOffsetStart, '540' ); ?>>9 hours</option>
						<option value="600" <?php selected( $eventOffsetStart, '600' ); ?>>10 hours</option>
						<option value="660" <?php selected( $eventOffsetStart, '660' ); ?>>11 hours</option>
						<option value="720" <?php selected( $eventOffsetStart, '720' ); ?>>12 hours</option>
					</select>
				</td>
			</tr>
			<tr class="cleanup-time">
				<td class="venuecheck-label">Cleanup Time:</td>
				<td class="venuecheck-block">

					<select tabindex="2003" name="_venuecheck_event_offset_end" id="_venuecheck_event_offset_end">
						<option value="0" <?php selected( $eventOffsetEnd, '0' ); ?>>None</option>
						<option value="15" <?php selected( $eventOffsetEnd, '15' ); ?>>15 minutes</option>
						<option value="30" <?php selected( $eventOffsetEnd, '30' ); ?>>30 minutes</option>
						<option value="45" <?php selected( $eventOffsetEnd, '45' ); ?>>45 minutes</option>
						<option value="60" <?php selected( $eventOffsetEnd, '60' ); ?>>1 hour</option>
						<option value="120" <?php selected( $eventOffsetEnd, '120' ); ?>>2 hours</option>
						<option value="180" <?php selected( $eventOffsetEnd, '180' ); ?>>3 hours</option>
						<option value="240" <?php selected( $eventOffsetEnd, '240' ); ?>>4 hours</option>
						<option value="300" <?php selected( $eventOffsetEnd, '300' ); ?>>5 hours</option>
						<option value="360" <?php selected( $eventOffsetEnd, '360' ); ?>>6 hours</option>
						<option value="420" <?php selected( $eventOffsetEnd, '420' ); ?>>7 hours</option>
						<option value="480" <?php selected( $eventOffsetEnd, '480' ); ?>>8 hours</option>
						<option value="540" <?php selected( $eventOffsetEnd, '540' ); ?>>9 hours</option>
						<option value="600" <?php selected( $eventOffsetEnd, '600' ); ?>>10 hours</option>
						<option value="660" <?php selected( $eventOffsetEnd, '660' ); ?>>11 hours</option>
						<option value="720" <?php selected( $eventOffsetEnd, '720' ); ?>>12 hours</option>
					</select>
				</td>
			</tr>
			<tr class="helper-text">
				<td>
				</td>
				<td>
					<div class="venuecheck-helper-text">Adding setup and cleanup time to your event is useful for reserving a venue with extra time at the beginning and/or end. Setup and cleanup time will not be displayed on your site with your event listings, but it will be used in venue conflict checking.</div>
				</td>
			</tr>
		</tbody>
	</table>
	<?php
}

// save offsets
add_action( 'save_post', 'venuecheck_save_offsets' );
function venuecheck_save_offsets( $post_id ) {
	// check autosave
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	// check post type
	if ( 'tribe_events' !== get_post_type( $post_id ) ) {
		return;
	}

	// check nonce
	if ( ! isset( $_POST['venuecheck_meta_nonce'] ) || ! wp_verify_nonce( $_POST['venuecheck_meta_nonce'], 'venuecheck-meta-nonce' ) ) {
		return;
	}

	if ( array_key_exists( '_venuecheck_event_offset_start', $_POST ) && ctype_digit( $_POST['_venuecheck_event_offset_start'] ) ) {
		update_post_meta(
			$post_id,
			'_venuecheck_event_offset_start',
			$_POST['_venuecheck_event_offset_start']
		);
	}

	if ( array_key_exists( '_venuecheck_event_offset_end', $_POST ) && ctype_digit( $_POST['_venuecheck_event_offset_end'] ) ) {
		update_post_meta(
			$post_id,
			'_venuecheck_event_offset_end',
			$_POST['_venuecheck_event_offset_end']
		);
	}
}

// make sure not to try to grab the WPORG version
add_filter( 'gu_override_dot_org', 'venue_check_gu_override_dot_org' );
function venue_check_gu_override_dot_org() {
	return array( 'venue-check/plugin.php' );
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
