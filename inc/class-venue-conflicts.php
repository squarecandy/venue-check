<?php
// phpcs:disable WordPress.PHP.DevelopmentFunctions.error_log_error_log
class Venue_Conflicts {

	public $conflicts                     = array();
	private $max_recurring_events_to_show = 1;
	public $parents                       = array();
	private $migrated                     = false;

	public function __construct() {
		$this->migrated = venuecheck_tec_migrated();
	}

	public function add_venue( $event, $start, $end, $venue_id ) {

		//display the date and time
		$event_venue_id    = $venue_id;
		$event_venue_title = get_the_title( $event_venue_id );
		$date_format       = apply_filters( 'venuecheck_date_format', 'n/j/Y' );
		$time_format       = apply_filters( 'venuecheck_time_format', 'g:ia' );
		$compact_time      = apply_filters( 'venuecheck_compact_time', ':00' );
		$show_timezone     = apply_filters( 'venuecheck_show_timezone', 'T' );
		$show_day          = apply_filters( 'venuecheck_show_day', 'D' );

		$start_day  = $start->format( $date_format ); //for comparing day
		$end_day    = $end->format( $date_format );
		$start_time = $start->format( $time_format );
		$end_time   = $end->format( $time_format );
		if ( $compact_time ) {
			$start_time = str_replace( $compact_time, '', $start_time );
			$end_time   = str_replace( ':00', '', $end_time );
		}

		$venuecheck_event_display  = $show_day ? $start->format( $show_day ) . ' ' : '';
		$venuecheck_event_display .= $start_day . ' ' . $start_time;
		$venuecheck_event_display .= ' &ndash; ';
		$venuecheck_event_display .= $end_time;

		if ( $start_day !== $end_day ) {
			$venuecheck_event_display .= ' ';
			$venuecheck_event_display .= $show_day ? $end->format( $show_day ) . ' ' : '';
			$venuecheck_event_display .= $end_day;
		}

		if ( $show_timezone ) {
			$venuecheck_event_display .= ' ' . $end->format( $show_timezone );
		}

		//display the venue
		if ( $event_venue_title ) {
			// add id & title to index for the venue id ( it may already exist, but id/title shouldn't change, so that's ok )
			$this->conflicts[ $event_venue_id ]['venueID']    = $event_venue_id;
			$this->conflicts[ $event_venue_id ]['venueTitle'] = $event_venue_title;

			if ( venuecheck_exclude_venues() && venuecheck_is_excluded_venue( $venue_id ) ) {
				$this->conflicts[ $event_venue_id ]['excluded'] = 1;
				if ( WP_DEBUG ) {
					error_log( $event_venue_id . ' is excluded' );
				}
			}

			// set up and add this event to an array of events for this venue
			$event_item = array(
				'postID'     => $event->ID,
				'eventTitle' => $event->post_title,
				'eventDate'  => $venuecheck_event_display,
				'eventClass' => '',
				'recurrence' => '',
			);

			// post TEC 6 we'll use the "parent" slot to denote the parent "event" of an "occurrence"
			if ( $this->migrated ) {

				$event_item['eventID']     = $event->occurrence_id; // use as eventID?
				$event_item['eventParent'] = $event->ID;
				$event_item['eventLink']   = admin_url( 'post.php?post=' . $event->occurrence_id . '&action=edit' ); //in edge cases get_edit_post_link seems to return incorrect link
				$series                    = tec_event_series( $event->ID );
				if ( $series ) {
					$event_item['eventSeries'] = $series->ID;
				}
			} else {

				$event_item['eventID']     = $event->ID;
				$event_item['eventParent'] = $event->parent_event;
				$event_item['eventLink']   = get_edit_post_link( $event->ID );
				$event_item['eventSeries'] = '';

				// if this is a recurring event and no parent is set, then the event is the "parent" of its set
				if ( tribe_is_recurring_event( $event->ID ) && ! $event->parent_event ) {

					$event->parent_event = $event->ID;

					if ( WP_DEBUG ) {
						error_log( $event->ID . ' is parent of series ' );
					}
				}
			}

			// if the event is recurring, add its parent/set to our records so we can groiup all recurring events together when displaying them
			if ( ! empty( $event->parent_event ) || tribe_is_recurring_event( $event->ID ) ) {

				$event_item['eventClass'] = 'recurring';

				if ( WP_DEBUG ) {
					error_log( $event->ID . ' is recurring in series ' . $event->parent_event );
				}

				// if this is the first of this series that we are processing, add that to the parents array
				if ( ! empty( $event->parent_event ) && ! isset( $this->conflicts[ $event_venue_id ]['series'][ $event->parent_event ] ) ) {

					// recurrence text now is output with placeholders that are usually completed in js, so we need to complete it ourselves
					$recurrence_text   = tribe_get_recurrence_text( $event->parent_event );
					$parent_start_date = get_post_meta( $event->parent_event, '_EventStartDate', true );
					$datetime          = new DateTime( $parent_start_date );
					$date              = $datetime->format( 'j F Y' );
					$time              = $datetime->format( 'g:i A' );
					$recurrence_text   = str_replace( '[first_occurrence_start_time]', $time, $recurrence_text );
					$recurrence_text   = str_replace( '[first_occurrence_date]', $date, $recurrence_text );

					$this->conflicts[ $event_venue_id ]['series'][ $event->parent_event ] = array(
						'id'         => $event->parent_event,
						'recurrence' => $recurrence_text,
					);

					if ( WP_DEBUG ) {
						error_log( '* * * is first in series ' );
						//phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
						error_log( print_r( $this->conflicts[ $event_venue_id ]['series'][ $event->parent_event ], true ) );
					}
				}
			}

			$this->conflicts[ $event_venue_id ]['events'][] = $event_item;
		}
		// if we've added to the array of events, or it already exists, filter out duplicates ( we might have flagged them as conflicting with an earlier recurrence? )
		if ( isset( $this->conflicts[ $event_venue_id ]['events'] ) ) {
			$this->conflicts[ $event_venue_id ]['events'] = array_unique( $this->conflicts[ $event_venue_id ]['events'], SORT_REGULAR );
		}
	}

	public function filter() {
		$this->conflicts = array_map( 'array_filter', $this->conflicts ); //remove empty array elements
		$this->conflicts = array_filter( $this->conflicts ); //remove empty array elements
		//sort by venue title
		if ( ! empty( $this->conflicts ) ) {
			usort(
				$this->conflicts,
				function ( $a, $b ) {
					return strcmp( strtolower( $a['venueTitle'] ), strtolower( $b['venueTitle'] ) );
				}
			);
		}
	}

}
