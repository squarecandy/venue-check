<?php
class Venue_Conflicts {

	public $conflicts                     = array();
	private $max_recurring_events_to_show = 1;
	public $parents                       = array();
	private $migrated                     = false;

	public function __construct(){
		$this->migrated = venuecheck_tec_migrated();
	}

	public function add_venue( $event, $start, $end, $venue_id ) {

		$EventVenueID    = $venue_id;
		$EventVenueTitle = get_the_title( $EventVenueID );

		$startDay = $start->format( 'm/d/Y' );
		$endDay   = $end->format( 'm/d/Y' );

		$venuecheck_eventDisplay  = $startDay . ' ' . $start->format( 'g:i a' );
		$venuecheck_eventDisplay .= ' &ndash; ';
		$venuecheck_eventDisplay .= $end->format( 'g:i a' );
		if ( $startDay != $endDay ) {
			$venuecheck_eventDisplay .= ' ' . $endDay;
		}
		$venuecheck_eventDisplay .= $end->format( ' T' );

		if ( $EventVenueTitle ) {
			// add id & title to index for the venue id ( it may already exist, but id/title shouldn't change, so that's ok )
			$this->conflicts[ $EventVenueID ]['venueID']    = $EventVenueID;
			$this->conflicts[ $EventVenueID ]['venueTitle'] = $EventVenueTitle;

			if ( venuecheck_exclude_venues() && venuecheck_is_excluded_venue( $venue_id ) ) {
				$this->conflicts[ $EventVenueID ]['excluded'] = 1;
				if ( WP_DEBUG ) {
					error_log( $EventVenueID . ' is excluded' );
				}
			}

			// set up and add this event to an array of events for this venue
			$event_item = array(
				'postID'      => $event->ID,
				'eventTitle'  => $event->post_title,
				'eventDate'   => $venuecheck_eventDisplay,
				'eventClass'  => '',
				'recurrence'  => '',
			);

			// post TEC 6 we'll use the "parent" slot to denote the parent "event" of an "occurrence"
			if ( $this->migrated ) {
				$event_item['eventID']     = $event->occurrence_id; // use as eventID?
				$event_item['eventParent'] = $event->ID;
				$event_item['eventLink']   = admin_url( 'post.php?post=' . $event->occurrence_id . '&action=edit' ); //in edge cases get_edit_post_link seems to return incorrect link
				$series = tec_event_series( $event->ID );
				if ( $series ) {
					$event_item['eventSeries'] = $series->ID;
				}
				error_log( 'link for ' . $event->occurrence_id . ': ' . $event_item['eventLink'] );
			} else {
				$event_item['eventID']     = $event->ID;
				$event_item['eventParent'] = $event->parent_event;
				$event_item['eventLink']   = get_edit_post_link( $event->ID );
				$event_item['eventSeries'] = '';

				// if this is a recurring event and no parent is set, then the event is the "parent" of its set
				if ( tribe_is_recurring_event( $event->ID ) && ! $event->parent_event  ) {

					$event->parent_event = $event->ID;

					if ( WP_DEBUG ) {
						error_log( $event->ID . ' is parent of series ' );
					}
				}
			}

			// if the event is recurring, add its parent/set to our records so we can groiup all recurring events together when displaying them
			if ( $event->parent_event || tribe_is_recurring_event( $event->ID ) ) {

				$event_item['eventClass'] = 'recurring';

				if ( WP_DEBUG ) {
					error_log( $event->ID . ' is recurring in series ' . $event->parent_event );
				}

				// if this is the first of this series that we are processing, add that to the parents array
				if ( $event->parent_event && ! isset( $this->conflicts[ $EventVenueID ]['series'][ $event->parent_event ] ) ) {

					// recurrence text now is output with placeholders that are usually completed in js, so we need to complete it ourselves
					$recurrence_text   = tribe_get_recurrence_text( $event->parent_event );
					$parent_start_date = get_post_meta( $event->parent_event, '_EventStartDate', true );
					$datetime          = new DateTime( $parent_start_date );
					$date              = $datetime->format('j F Y');
					$time              = $datetime->format('g:i A');
					$recurrence_text   = str_replace( '[first_occurrence_start_time]', $time, $recurrence_text );
					$recurrence_text   = str_replace( '[first_occurrence_date]', $date, $recurrence_text );

					$this->conflicts[ $EventVenueID ]['series'][ $event->parent_event ] = array(
						'id'         => $event->parent_event,
						'recurrence' => $recurrence_text,
					);

					if ( WP_DEBUG ) {
						error_log( '* * * is first in series ' );
						error_log( print_r( $this->conflicts[ $EventVenueID ]['series'][ $event->parent_event ], true ) );
					}
				}
			}

			$this->conflicts[ $EventVenueID ]['events'][] = $event_item;
		}
		// if we've added to the array of events, or it already exists, filter out duplicates ( we might have flagged them as conflicting with an earlier recurrence? )
		if ( isset( $this->conflicts[ $EventVenueID ]['events'] ) ) {
			$this->conflicts[ $EventVenueID ]['events'] = array_unique( $this->conflicts[ $EventVenueID ]['events'], SORT_REGULAR );
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
