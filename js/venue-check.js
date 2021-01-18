/* eslint-disable no-console */
/* eslint-disable camelcase */
/* global venuecheck */
( function( $ ) {
	window.addEventListener( 'load', function() {
		//=====FORM MODIFIED=====//

		//only trigger modified message on updating events
		const loc = window.location.href;
		if ( /post-new.php/.test( loc ) ) {
			$( 'body' ).addClass( 'venuecheck-new' );
		}
		if ( /post.php/.test( loc ) ) {
			$( 'body' ).addClass( 'venuecheck-update' );
		}

		setTimeout( function() {
			const $form = $( 'form#post' );
			const origForm = $form.serialize();

			console.log( 'check form change status after 3 seconds' );

			//removes the modified message when editing existing events
			$( document ).on(
				'change',
				'body.venuecheck-update #EventInfo :input,' +
					'body.venuecheck-update #EventInfo .tribe-dropdown,' +
					'body.venuecheck-update #EventInfo .tribe-button-field',
				function() {
					if ( $form.serialize() !== origForm ) {
						venuecheck_show_modified_msg();
					} else {
						venuecheck_hide_modified_msg();
					}
				}
			);

			//does not remove modified message for new events
			$( document ).on(
				'click',
				'body.venuecheck-update .tribe-row-delete-dialog .ui-dialog-buttonpane .ui-dialog-buttonset .button-red',
				function() {
					venuecheck_show_modified_msg();
				}
			);
		}, 3000 );

		//=====FORM MODIFIED=====//

		function venuecheck_get_event_recurrences() {
			const batchsize = 25;
			const recurrence_warning_limit = 50;
			const formVars = {};
			$.each( $( 'form#post' ).serializeArray(), function( i, field ) {
				formVars[ field.name ] = field.value;
			} );

			if ( $( '#allDayCheckbox' ).prop( 'checked' ) === true ) {
				formVars.EventStartTime = '00:00:00';
				formVars.EventEndTime = '23:59:59';
			}

			const start = formVars.EventStartTime;
			console.log( 'start' );
			console.log( start );
			console.log( 'start' );
			const end = formVars.EventEndTime;
			const startTime = venuecheck_convert_time( start );
			const endTime = venuecheck_convert_time( end );

			const event_recurrences = [];
			const event_recurrence = {
				eventStart: formVars.EventStartDate + ' ' + startTime,
				eventEnd: formVars.EventEndDate + ' ' + endTime,
				eventTimezone: formVars.EventTimezone,
				eventOffsetStart: formVars._venuecheck_event_offset_start,
				eventOffsetEnd: formVars._venuecheck_event_offset_end,
			};

			event_recurrences.push( event_recurrence );
			const post_data = $( 'form#post' ).serialize();
			venuecheck_disable_form();
			if ( typeof formVars[ 'is_recurring[]' ] !== 'undefined' ) {
				console.log( 'RECURRING EVENT' );
				return $.ajax( {
					type: 'POST',
					url: venuecheck.ajax_url,
					dataType: 'json',
					data: {
						action: 'venuecheck_get_event_recurrences',
						security: $( '#venuecheck_nonce' ).val(),
						post_data,
					},
				} )
					.done( function( response ) {
						$.merge( event_recurrences, response );
						console.log( '=====/////RECURRENCES-RECURRING/////=====' );
						console.log( event_recurrences );
						console.log( '=====/////RECURRENCES-RECURRING/////=====' );
						if ( event_recurrences.length > recurrence_warning_limit ) {
							venuecheck_hide_wait();
							const recurrrences_num = event_recurrences.length;
							$( '#venuecheck-messages-container' ).addClass( 'has-messages' );
							$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).show();
							$( '#venuecheck-recurrence-count' ).text( recurrrences_num );
							$( '#venuecheck-recurrence-warning-cancel' )
								.unbind()
								.click( function() {
									$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).hide();
									venuecheck_enable_form();
									return false;
								} );
							$( '#venuecheck-recurrence-warning-continue' )
								.unbind()
								.click( function() {
									$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).hide();
									console.log( 'venuecheck_check_venues 1' );
									venuecheck_check_venues( event_recurrences, batchsize );
								} );
						} else {
							venuecheck_hide_wait();
							console.log( 'venuecheck_check_venues 2' );
							venuecheck_check_venues( event_recurrences, batchsize );
						}
					} )
					.fail( function( jqXHR, textStatus, error ) {
						console.log( 'ajax error: ' + error );
					} );
			}
			console.log( '=====/////RECURRENCES/////=====' );
			console.log( event_recurrences );
			console.log( '=====/////RECURRENCES/////=====' );
			venuecheck_hide_wait();
			console.log( 'venuecheck_check_venues 3' );
			venuecheck_check_venues( event_recurrences, batchsize );
		} //venuecheck_get_event_recurrences

		/**
		 *
		 * ajax calls venuecheck_check_venues
		 *
		 * @param array event_recurrences
		 * @return event_conflicts
		 *
		 */

		function venuecheck_check_venues( event_recurrences, batch_size ) {
			venuecheck_show_progress_bar();

			const postID = $( '#post_ID' ).val();
			// pre-split array into batchs
			const batchArray = [];
			for ( let i = 0; i < event_recurrences.length; i += batch_size ) {
				console.log( i );
				batchArray.push( event_recurrences.slice( i, i + batch_size ) );
			}

			let venuecheck_conflicts = [];
			// use .reduce() design pattern for chaining and serializing
			// a sequence of async operations

			return batchArray
				.reduce( function( p, batch ) {
					const total_count = event_recurrences.length;
					const batch_count = batchArray.indexOf( batch );
					return p.then( function() {
						return $.ajax( {
							type: 'POST',
							dataType: 'json',
							url: venuecheck.ajax_url,
							data: {
								action: 'venuecheck_check_venues',
								event_recurrences: batch,
								postID,
								total_count,
								batch_size,
								batch_count,
							},
							beforeSend() {
								const batch_remainder = Math.max( 0, ( batch_count + 1 ) * batch_size - total_count );
								const percent_current = Math.round( ( ( batch_count * batch_size ) / total_count ) * 100 );
								const percent_end = Math.round(
									( ( ( batch_count + 1 ) * batch_size - batch_remainder ) / total_count ) * 100
								);
								if ( batchArray.length > 1 ) {
									venuecheck_check_venues_progress( percent_current, percent_end );
								}
								$( '#saved_tribe_venue' ).select2( {
									disabled: true,
								} );
							},
						} ).then( function( data ) {
							venuecheck_conflicts = venuecheck_conflicts.concat( data );
						} );
					} );
				}, Promise.resolve() )
				.then( function() {
					// flatten response array
					const result = Object.values(
						venuecheck_conflicts.reduce( function( a, curr ) {
							if ( ! a[ curr.venueTitle ] ) {
								// if the room is not present in map than add it.
								a[ curr.venueTitle ] = curr;
							} else {
								// if room exist than simply concat the reservations array of map and current element
								a[ curr.venueTitle ].events = a[ curr.venueTitle ].events.concat( curr.events );
							}
							return a;
						}, {} )
					);

					console.log( '=====CONFLCTS=====' );
					console.log( venuecheck_conflicts );
					console.log( '=====CONFLCTS=====' );

					venuecheck_conflicts = result;

					console.log( '=====CONFLCTS MERGED=====' );
					console.log( venuecheck_conflicts );
					console.log( '=====CONFLCTS MERGED=====' );

					clearTimeout( progress );
					$( '#venuecheck-progress .progress-bar span' ).css( {
						width: '100%',
					} );
					$( '.venuecheck-progress-percent-done' ).text( '100%' );

					setTimeout( function() {
						venuecheck_check_venues_handler( venuecheck_conflicts );
					}, 500 );
				} );
		} //venuecheck_check_venues

		/**
		 *
		 * updates progress bar percentage on ui
		 *
		 */

		let progress;

		function venuecheck_check_venues_progress( percent_current, percent_end ) {
			clearTimeout( progress );
			console.log( '=====percent=====' );
			console.log( percent_current );
			console.log( '=====percent=====' );

			$( '#venuecheck-progress .progress-bar span' ).css( {
				width: percent_current + '%',
			} );
			$( '.venuecheck-progress-percent-done' ).text( percent_current + '%' );
			percent_current += Math.floor( Math.random() * 5 + 1 ); //randomize step size
			if ( percent_current <= percent_end ) {
				const timeout = Math.floor( Math.random() * 1500 + 300 ); //randomize step duration
				progress = setTimeout( function() {
					venuecheck_check_venues_progress( percent_current, percent_end );
				}, timeout );
			} else if ( percent_end === 100 ) {
				$( '#venuecheck-progress .progress-bar span' ).css( {
					width: '100%',
				} );
				$( '.venuecheck-progress-percent-done' ).text( '100%' );
			}
		}

		/**
		 * disables venue conflicts in venues menu
		 * creates report of events with conflicts
		 *
		 * @param {Array} venuecheck_conflicts
		 */
		function venuecheck_check_venues_handler( venuecheck_conflicts ) {
			$( 'body' ).addClass( 'venuecheck-update' );

			console.log( 'starting venuecheck_check_venues_handler' );
			const venuecheck_venues = $( '#saved_tribe_venue' ).find( 'option, optgroup' );
			const venuecheck_venue_options = [ {} ];

			console.log( 'venuecheck_venues', venuecheck_venues );

			// remove the confusing double list from Modern Tribe ("My Venues" vs "Available Venues")
			venuecheck_venues.each( function() {
				if (
					'My Venues' === $( this ).attr( 'label' ) ||
					'My Venues' ===
						$( this )
							.parent()
							.attr( 'label' )
				) {
					$( this ).remove();
				}

				if ( 'Available Venues' === $( this ).attr( 'label' ) ) {
					$( this )
						.parent()
						.append( $( this ).html() );
					$( this ).remove();
				}
			} );

			//disable and message any venue venuecheck_conflicts
			let venuecheck_venue_report_count = '';
			let venuecheck_venue_report = '';
			if ( typeof venuecheck_conflicts !== 'undefined' && venuecheck_conflicts.length !== 0 ) {
				let venuecheck_conflicts_count = Object.keys( venuecheck_conflicts ).length;
				venuecheck_conflicts_count =
					venuecheck_conflicts_count + ( venuecheck_conflicts_count === 1 ? ' unavailable venue.' : ' unavailable venues.' );
				venuecheck_venue_report_count +=
					'<div id="venuecheck-conflicts-report-count" class="notice notice-info">' + venuecheck_conflicts_count;
				venuecheck_venue_report_count += '&nbsp;<a id="venuecheck-conflicts-report-link">Show Details</a></div>';
				venuecheck_venue_report += '<div id="venuecheck-conflicts-report-container">';
				venuecheck_venue_report += '<div id="venuecheck-report-links">';
				venuecheck_venue_report += '<a id="venuecheck-report-conflicts-link">Recheck for Venue Conflicts</a>';
				venuecheck_venue_report += '<span class="venuecheck-divider">&nbsp;|&nbsp;</span>';
				venuecheck_venue_report += '<a id="venuecheck-conflicts-report-close">Close</a>';
				venuecheck_venue_report += '</div>';
				venuecheck_venue_report += '<table id="venuecheck-conflicts-report-table">';

				console.log( 'venuecheck_conflicts', venuecheck_conflicts, $.type( venuecheck_conflicts ) );
				console.log( 'venuecheck_venue_options', venuecheck_venue_options );

				// reset all options to enabled by default before we loop through.
				$( '#saved_tribe_venue option' ).removeAttr( 'disabled' );

				$.each( venuecheck_conflicts, function( index, venue ) {
					console.log( index, venue.venueID, venue );

					// disable the option
					$( '#saved_tribe_venue option[value="' + venue.venueID + '"]' ).attr( 'disabled', 'disabled' );

					//prepare venue report
					venuecheck_venue_report +=
						'<thead class="venuecheck-conflicts-report-venue-title"><tr><td colspan="2">' +
						venue.venueTitle +
						'</td></tr></thead>';
					venuecheck_venue_report +=
						'<thead class="venuecheck-conflicts-report-venue-heading"><tr><td>Date</td><td>Event</td></tr></thead><tbody>';
					$.each( venue.events, function( index2, event ) {
						venuecheck_venue_report +=
							'<tr><td class="venuecheck-conflicts-report-venue-date">' +
							event.eventDate +
							'</td><td class="venuecheck-conflicts-report-venue-event"><a href="' +
							event.eventLink +
							'" target="_blank" class="venuecheck-report-link"><span>' +
							event.eventTitle +
							'</span><i class="fas fa-external-link-alt" aria-hidden="true"></i></a></td></tr>';
					} );
				} );
				venuecheck_venue_report += '</tbody></table></div>';
			} else if ( venuecheck_conflicts.length === 0 ) {
				// there are no conflicts found

				// notificaiton
				venuecheck_venue_report_count +=
					'<div id="venuecheck-conflicts-report-count" class="notice notice-info">All venues are available.</div>';
				venuecheck_venue_report += '';

				// re-enable any previously diabled options
				$( '#saved_tribe_venue option' ).removeAttr( 'disabled' );
			}

			$( '#venuecheck-messages' ).append( venuecheck_venue_report_count );
			$( '#venuecheck-conflicts-report' )
				.append( venuecheck_venue_report )
				.show();

			$( '#venuecheck-conflicts-report-link, #venuecheck-conflicts-report-close' ).on( 'click', function() {
				$( '#venuecheck-report-container' ).slideToggle( 'fast' );
				$( '#venuecheck-conflicts-report-link' ).html(
					$( '#venuecheck-conflicts-report-link' ).text() === 'Show Details' ? 'Hide Details' : 'Show Details'
				);
			} );

			$( '#venuecheck-venue-select' ).show();

			$( '#venuecheck-processing, #venuecheck-progress' ).hide();

			$( '#venuecheck-conflicts-link' ).removeClass( 'venuecheck-disabled' );
			$( '#publish' ).prop( 'disabled', false );
			$( '#saved_tribe_venue' ).select2( {
				disabled: false,
			} );
			$( '#venuecheck-change-venue' ).hide();
			$( 'body' ).addClass( 'venuecheck-venues' );
			venuecheck_enable_form();
		} // end venuecheck_handle_check_venues

		function venuecheck_convert_time( time ) {
			if ( ! time ) {
				// fallback default
				return '00:00:00';
			}

			let hours = 0;
			const hoursMatch = time.match( /^(\d+)/ );
			if ( hoursMatch && 1 in hoursMatch ) {
				hours = Number( hoursMatch[ 1 ] );
			}

			let minutes = 0;
			const minutesMatch = time.match( /:(\d+)/ );
			if ( minutesMatch && 1 in minutesMatch ) {
				minutes = Number( minutesMatch[ 1 ] );
			}

			// get am/pm and convert to 24h time if needed
			const AMPM = time.substr( -2 ).toLowerCase();
			if ( AMPM === 'pm' && hours < 12 ) hours = hours + 12;
			if ( AMPM === 'am' && hours === 12 ) hours = hours - 12;

			// hours and minutes to strings with leading zeros
			let sHours = hours.toString();
			let sMinutes = minutes.toString();
			if ( hours < 10 ) sHours = '0' + sHours;
			if ( minutes < 10 ) sMinutes = '0' + sMinutes;

			return sHours + ':' + sMinutes + ':00';
		}

		function venuecheck_show_hide_offsets() {
			if ( $( '#allDayCheckbox' ).prop( 'checked' ) === true ) {
				$( '#venuecheck-offsets' ).hide();
				$( '#_venuecheck_event_offset_start' ).val( '0' );
				$( '#_venuecheck_event_offset_end' ).val( '0' );
			} else {
				$( '#venuecheck-offsets' ).show();
			}
		}

		$( '#allDayCheckbox' ).click( function() {
			venuecheck_show_hide_offsets();
		} );

		function venuecheck_show_modified_msg() {
			$( '#venuecheck-messages-container, #venuecheck-modified-publish, #venuecheck-modified' ).show();
			$( '#venuecheck-report-container, #venuecheck-conflicts-report-count, #venuecheck-progress' ).hide();
			$( '#publish' ).prop( 'disabled', true );
			$( '#saved_tribe_venue' ).select2( {
				disabled: true,
			} );
			$( '#venuecheck-change-venue' ).show();
		}

		function venuecheck_hide_modified_msg() {
			$( '#venuecheck-messages-container, #venuecheck-modified-publish, #venuecheck-modified' )
				.not( '.active' )
				.hide();
			$( '#venuecheck-messages-container.has-messages, #venuecheck-conflicts-report-count' ).show();
			$( '#publish' ).prop( 'disabled', false );
			if ( $( 'body' ).hasClass( 'venuecheck-venues' ) ) {
				$( '#venuecheck-messages-container' ).show();
				$( '#venuecheck-report-container' ).hide();
				$( '#venuecheck-conflicts-report-link' ).text( 'Show Details' );
				//here
				$( '#saved_tribe_venue' ).select2( {
					disabled: false,
				} );
			}
		}

		function venuecheck_show_wait() {
			$( '#venuecheck-messages-container' ).addClass( 'has-messages' );
			$( '#venuecheck-messages-container, #venuecheck-wait' ).show();
		}

		function venuecheck_hide_wait() {
			$( '#venuecheck-messages-container' ).removeClass( 'has-messages' );
			$( '#venuecheck-messages-container, #venuecheck-wait' ).hide();
		}

		function venuecheck_hide_messages() {
			$( '#venuecheck-conflicts-report-count, #venuecheck-conflicts-report-container' ).remove();
			$(
				'#venuecheck-report-container,' +
					'#venuecheck-messages-container,' +
					'#venuecheck-modified-publish,' +
					'#venuecheck-modified,' +
					'#venuecheck-conflicts-report'
			).hide();
			$( '#venuecheck-messages-container' ).removeClass( 'has-messages' );
		}

		function venuecheck_disable_form() {
			$( '#saved_tribe_venue' )
				.prop( 'readonly', true )
				.addClass( 'venuecheck-preserve-disabled' );
			$( '.tribe-datetime-block :input:disabled' ).addClass( 'venuecheck-preserve-disabled' );
			$( '#saved_tribe_venue' ).select2( {
				disabled: true,
			} );
			$( '#publish' ).prop( 'disabled', true );
			$( '.tribe-datetime-block :input' ).prop( 'disabled', true );
			$( '#tribe_events_event_details a' )
				.not(
					'#venuecheck-cancel, #venuecheck-recurrence-warning-continue, #venuecheck-recurrence-warning-cancel, .select2-choice'
				)
				.addClass( 'venuecheck-disabled' );
		}

		function venuecheck_enable_form() {
			$( '#saved_tribe_venue:not(.venuecheck-preserve-disabled)' ).select2( 'readonly', false );
			$( '.tribe-datetime-block :input:not(.venuecheck-preserve-disabled)' ).prop( 'disabled', false );
			$( '#saved_tribe_venue, .tribe-datetime-block :input' ).removeClass( 'venuecheck-preserve-disabled' );
			$( '#publish' ).prop( 'disabled', false );
			$( '#tribe_events_event_details a' ).removeClass( 'venuecheck-disabled' );
			// const origForm = $( 'form#post' ).serialize();
		}

		function venuecheck_show_progress_bar() {
			$( '#venuecheck-progress .progress-bar span' ).css( {
				width: '0%',
			} );
			$( '.venuecheck-progress-percent-done' ).text( '0%' );
			$( '#venuecheck-messages-container, #venuecheck-progress' ).show();
			// venuecheck_check_venues_progress();
		}

		function venuecheck_find_available_venues() {
			venuecheck_hide_messages();
			venuecheck_show_wait();
			venuecheck_get_event_recurrences();
		}

		function venuecheck_show_hide_divider() {
			if ( $( '#saved_tribe_venue' ).val() === '' ) {
				$( '#venuecheck-change-venue .venuecheck-divider' ).hide();
			} else {
				$( '#venuecheck-change-venue .venuecheck-divider' ).show();
			}
		}

		//add venuecheck
		$( '#tribe_events_event_details' ).addClass( 'venuecheck-update' );

		//add section
		$( '#event_tribe_venue tbody:first' ).addClass( 'venuecheck-section' );

		//add section label
		$( '#event_tribe_venue > tbody > tr:first' ).before(
			'<tr>' +
				'<td colspan="2" class="venuecheck-section-label">' +
				'Venue Check<i class="fas fa-spinner fa-pulse venuecheck-preload"></i>' +
				'</td>' +
				'</tr>'
		);

		//add conflicts button
		$( '#event_tribe_venue .venuecheck-section tr:nth-child(2) td:nth-child(2)' ).wrapInner(
			'<div id="venuecheck-venue-select"></div>'
		);
		$( '#event_tribe_venue .venuecheck-section tr:nth-child(2) td:nth-child(2)' ).append(
			'<a id="venuecheck-conflicts-button" class="button">Find available venues</a>'
		);

		//add messages
		$( '#event_tribe_venue .venuecheck-section tr:nth-child(2) td:nth-child(2)' ).append(
			'<div id="venuecheck-messages-container" style="display: none;"><div id="venuecheck-messages"></div></div>'
		);
		$( '#event_tribe_venue .venuecheck-section tr:nth-child(3)' ).after(
			'<tr id="venuecheck-report-container" style="display: none;"><td colspan="2" id="venuecheck-report"></td>/tr>'
		);
		$( '#event_tribe_venue .venuecheck-section tr:nth-child(4)' ).after( '<tr class="venuecheck-spacer"><td></td><td></td></tr>' );

		//add conflicts link
		$( '#event_tribe_venue .edit-linked-post-link' ).after(
			'<div id="venuecheck-change-venue" style="display: none;">' +
				'<a id="venuecheck-conflicts-link" class="button">Change Venue</a>' +
				'</div>'
		);

		$( '#saved_tribe_venue' ).on( 'change', function() {
			venuecheck_show_hide_divider();
		} );

		if ( $( 'body' ).hasClass( 'venuecheck-new' ) ) {
			$( '#venuecheck-conflicts-button' ).show();
		} else {
			$( '#venuecheck-conflicts-button' ).hide();
		}

		const wait =
			'<div id="venuecheck-wait" style="display: none;">' +
			'<span class="venuecheck-message">' +
			'<i class="fas fa-spinner fa-pulse fa-fw"></i><span class="sr-only">Loading...</span>' +
			'Getting event recurrences...' +
			'</span>' +
			'</div>';
		const venue_modified_publish =
			'<div id="venuecheck-modified-publish" style="display: none;" class="notice notice-error">' +
			'Because the date/time of this event was modified, the currently selected venue may not be available. ' +
			'See venue selection below for more information.' +
			'</div>';
		const venue_modified =
			'<div id="venuecheck-modified" style="display: none;" class="notice notice-error">' +
			'Because the date/time of this event was modified, you need to ' +
			'<a id="modified-conflicts">recheck for venue conflicts</a> before you can save changes.' +
			'</div>';
		const progress_message =
			'<div id="venuecheck-progress" style="display: none;">' +
			'<span class="venuecheck-message">' +
			'<i class="fas fa-spinner fa-pulse fa-fw"></i>' +
			'<span class="sr-only">Loading...</span>' +
			'Finding available venues...' +
			'</span> ' +
			'<span class="venuecheck-message venuecheck-progress-percent-done">0%</span>' +
			'<div id="venuecheck-progress-bar" class="progress-bar green stripes"><span style="width: 0%"></span></div>' +
			'</div>';
		const report = '<div id="venuecheck-conflicts-report"></div>';
		const recurrence_warning =
			'<div id="venuecheck-recurrence-warning" style="display: none;" class="notice notice-warning">' +
			'It may take up to a minute or more to find available venues for all ' +
			'<span id="venuecheck-recurrence-count"></span> events in this series.<br>' +
			'<em>Note: this system is only able to check conflicts up to 2 years into the future.</em><br>' +
			'Would you like to continue? <a id="venuecheck-recurrence-warning-continue">Continue</a>' +
			'<span class="venuecheck-divider">&nbsp;|&nbsp;</span>' +
			'<a id="venuecheck-recurrence-warning-cancel">Cancel</a>' +
			'</div>';

		$( '#major-publishing-actions' ).append( venue_modified_publish );
		$( '#venuecheck-messages' ).append( [ wait, venue_modified, progress_message, recurrence_warning ] );
		$( '#venuecheck-report-container td' ).append( report );

		//venue check link
		$( document ).on(
			'click',
			'#venuecheck-conflicts-button, #venuecheck-conflicts-link, #venuecheck-report-conflicts-link, #venuecheck-modified',
			venuecheck_find_available_venues
		);

		// recheck for conflicts whenever any of the date fields change
		/*
		$(
			'#EventStartDate,' +
				'#EventStartTime,' +
				'#EventEndDate,' +
				'#EventEndTime,' +
				'#allDayCheckbox,' +
				'#_venuecheck_event_offset_start,' +
				'#_venuecheck_event_offset_end'
		).on( 'change', venuecheck_find_available_venues );
		*/

		//disable venues dropdown
		$( '#saved_tribe_venue' ).select2( {
			disabled: true,
		} );

		// empty out the link to edit the venue item
		$( '.edit-linked-post-link' ).html( '' );

		// show the change venue button
		$( '#venuecheck-change-venue' ).show();

		venuecheck_show_hide_offsets();
		venuecheck_show_hide_divider();
	} ); //load
} )( jQuery );
