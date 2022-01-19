<?php
class Venue_Conflicts {

	public $conflicts = array();

	public function add_venue( $event, $start, $end, $venue_id ) {
		$EventVenueID             = $venue_id;
		$EventVenueTitle          = get_the_title( $EventVenueID );

		$venuecheck_eventDisplay  = $start->format( 'm/d/Y g:i a' );
		$venuecheck_eventDisplay .= ' &ndash; ';
		$venuecheck_eventDisplay .= $end->format( 'g:i a m/d/Y T' );
		
		if ( $EventVenueTitle ) {
			// add id & title to index for the venue id ( it may already exist, but id/title shouldn't change, so that's ok )
			$this->conflicts[ $EventVenueID ]['venueID']    = $EventVenueID;
			$this->conflicts[ $EventVenueID ]['venueTitle'] = $EventVenueTitle;

			// add this event to an array of events for this venue
			$this->conflicts[ $EventVenueID ]['events'][]   = array(
				'eventLink'  => get_edit_post_link( $event->ID ),
				'eventTitle' => $event->post_title,
				'eventDate'  => $venuecheck_eventDisplay,
			);
		}
		// if we've added to the array of events, or it already exists, filter out duplicates ( we might have flagged them as conflicting with an earlier recurrence? )
		if ( isset( $this->conflicts[ $EventVenueID ]['events'] ) ) {
			$this->conflicts[ $EventVenueID ]['events'] = array_unique( $this->conflicts[ $EventVenueID ]['events'], SORT_REGULAR );
		}
	}

	public function filter(){
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