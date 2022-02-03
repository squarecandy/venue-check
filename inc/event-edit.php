<?php
/* set up for event edit admin page */
// phpcs:disable NamingConventions.ValidVariableName.VariableNotSnakeCase
// phpcs:disable WordPress.NamingConventions.ValidVariableName
// phpcs:disable WordPress.PHP.DevelopmentFunctions.error_log_error_log

// add admin body classes
add_filter( 'admin_body_class', 'venuecheck_admin_body_class' );
function venuecheck_admin_body_class( $class ) {
	$screen = get_current_screen();
	if ( 'tribe_events' === $screen->id && 'post' === $screen->base ) {
		$classes = explode( ' ', $class );
		if ( 'add' === $screen->action ) {
			$classes[] = 'venuecheck-new';
		} else {
			$classes[] = 'venuecheck-update';
		}
		return implode( ' ', $classes );
	}
}


// add html to the publish post section
add_action( 'post_submitbox_start', 'venue_check_post_submitbox_start' );
function venue_check_post_submitbox_start( $post ) {
	if ( 'tribe_events' === $post->post_type ) {
		echo '<div id="venuecheck-modified-publish" style="display: none;" class="venuecheck-notice notice-error">' .
				'Because the date/time of this event was modified, the currently selected venue may not be available. ' .
				'See venue selection below for more information.' .
				'</div>';
	}
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

					<select tabindex="0" name="_venuecheck_event_offset_start" id="_venuecheck_event_offset_start">
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

					<select tabindex="0" name="_venuecheck_event_offset_end" id="_venuecheck_event_offset_end">
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


// add html after the venue section
add_action( 'tribe_after_location_details', 'venuecheck_tribe_after_location_details', 999 );
function venuecheck_tribe_after_location_details( $event_id ) {
	?>
	<table class="eventtable venuecheck-section">
		<tr id="venuecheck-messages-container" style="display: none;">
			<td></td>
			<td>
				<div id="venuecheck-messages-container-inner">
					<div id="venuecheck-messages">
						<div id="venuecheck-wait" style="display: none;">
							<span class="venuecheck-message"><i class="fas fa-spinner fa-pulse fa-fw"></i><span class="sr-only">Loading...</span>Getting event recurrences...</span>
						</div>
						<div id="venuecheck-modified" style="display: none;" class="venuecheck-notice notice-error">Because the date/time of this event was modified, you need to <button id="modified-conflicts" type="button">recheck for venue conflicts</button> before you can save changes.</div>
						<div id="venuecheck-progress" style="display: none;">
							<span class="venuecheck-message"><i class="fas fa-spinner fa-pulse fa-fw"></i><span class="sr-only">Loading...</span>Finding available venues...</span>
							<span class="venuecheck-message venuecheck-progress-percent-done">0%</span>
							<div id="venuecheck-progress-bar" class="progress-bar green stripes">
								<span style="width: 0%"></span>
							</div>
						</div>
						<div id="venuecheck-recurrence-warning" style="display: none;" class="venuecheck-notice notice-warning">
							It may take up to a minute or more to find available venues for all <span id="venuecheck-recurrence-count"></span> events in this series.<br><em>Note: this system is only able to check conflicts up to 2 years into the future.</em><br>Would you like to continue? <button id="venuecheck-recurrence-warning-continue" type="button">Continue</button><span class="venuecheck-divider">&nbsp;|&nbsp;</span><button id="venuecheck-recurrence-warning-cancel" type="button">Cancel</button>
						</div>
					</div>
				</div>
			</td>
		</tr>
		<tr id="venuecheck-report-container" style="display: none;">
			<td colspan="2" id="venuecheck-report"><div id="venuecheck-conflicts-report"></div></td>
		</tr>
	</table>
	<?php

}
