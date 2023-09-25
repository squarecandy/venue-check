<?php
class Venue_Conflicts {

	public $conflicts                     = array();
	private $max_recurring_events_to_show = 1;
	public $parents                       = array();

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
				'eventID'     => $event->occurrence_id, // use as eventID?
				'eventLink'   => get_edit_post_link( $event->occurrence_id ), //what does this return now
				'eventTitle'  => $event->post_title,
				'eventDate'   => $venuecheck_eventDisplay,
				'eventParent' => $event->post_parent,
				'eventClass'  => '',
				'recurrence'  => '',
				'EventSeries' => tec_event_series( $event->ID ),
			);

			// if this is a recurring event
			if ( $event->post_parent || tribe_is_recurring_event( $event->ID ) ) {
				$event_item['eventClass'] = 'recurring';
				if ( WP_DEBUG ) {
					error_log( $event->ID . ' is recurring in series ' . $event->post_parent );
				}

				// if this is the first of this series that we are processing, flag that in the parents array
				//if ( ! isset( $this->parents[ $EventVenueID ][ $event->post_parent ] ) ) {
				if ( ! isset( $this->conflicts[ $EventVenueID ]['series'][ $event->post_parent ] ) ) {

					
					$this->conflicts[ $EventVenueID ]['series'][ $event->post_parent ] = array(
						'id'         => $event->post_parent,
						'recurrence' => tribe_get_recurrence_text( $event->post_parent ),
					);
					if ( WP_DEBUG ) {
						error_log( '* * * is first in series ' );
						error_log( print_r( $this->conflicts[ $EventVenueID ]['series'][ $event->post_parent ], true ) );
					}

					/*
					// if the parent event of the recurring series preceded us, it wouldn't have triggered the above check, so flag it as first
					if ( isset( $this->conflicts[ $EventVenueID ]['events'][ $event->post_parent ] ) ) {
						$this->parents[ $EventVenueID ][ $event->post_parent ]['first_event'] = $event->post_parent;
						$parent_key = array_search( $event->post_parent, array_column( $this->conflicts[ $EventVenueID ]['events'], 'eventID' ) );
						$this->conflicts[ $EventVenueID ]['events'][ $parent_key ]['recurrence'] = tribe_get_recurrence_text( $event->post_parent );
					} else {
						$this->parents[ $EventVenueID ][ $event->post_parent ]['first_event'] = $event->ID;
						$event_item['recurrence'] = tribe_get_recurrence_text( $event->post_parent );
					}
					*/
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
