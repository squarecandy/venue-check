<?php
/* set up for venue edit admin page */

add_action( 'tribe_events_after_venue_metabox', 'venuecheck_after_venue_metabox', 100 );
function venuecheck_after_venue_metabox( $post ) {
	if ( venuecheck_exclude_venues() ) :
		$checked = get_post_meta( $post->ID, 'venuecheck_exclude_venue', true );
		?>
		<table id="venuecheck-exclude-venue">
			<tbody class="venuecheck-section tribe-datetime-block">
				<tr class="venue-check-title-bar">
					<td colspan="2" class="venuecheck-section-label">Venue Check</td>
				</tr>
				<tr>
					<td>
						<label for="venuecheck_exclude_venue">Exclude Venue from Venuecheck:</label>
					</td>
					<td>
						<input type="hidden" name="venuecheck_meta_nonce" value="<?php echo wp_create_nonce( 'venuecheck-meta-nonce' ); ?>"> 
					    <input type="checkbox" name="venuecheck_exclude_venue" value="1"<?php echo $checked ? 'checked' : '' ?>>
					    <p class="description">Checking this box will allow events to be booked simultaneously in this venue.</p>
					</td>
				</tr>
			</tbody>
		</table>
	    <?php
	endif;
}


// save offsets
add_action( 'save_post', 'venuecheck_save_exclude_venue' );
function venuecheck_save_exclude_venue( $post_id ) {

	if ( ! venuecheck_exclude_venues() ) {
		return;
	}

	// check autosave
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	// check post type
	if ( 'tribe_venue' !== get_post_type( $post_id ) ) {
		return;
	}

	// check nonce
	if ( ! isset( $_POST['venuecheck_meta_nonce'] ) || ! wp_verify_nonce( $_POST['venuecheck_meta_nonce'], 'venuecheck-meta-nonce' ) ) {
		return;
	}

	if ( array_key_exists( 'venuecheck_exclude_venue', $_POST ) && '1' === $_POST['venuecheck_exclude_venue' ] ) {
		update_post_meta(
			$post_id,
			'venuecheck_exclude_venue',
			$_POST['venuecheck_exclude_venue']
		);
	} else {
		delete_post_meta( $post_id, 'venuecheck_exclude_venue' );
	}

}