/* venue-check.js v2.2.0-rc5 */
/* eslint-disable no-console */
/* eslint-disable camelcase */
/* global venuecheck */
jQuery( function( $ ) {
	const vcObject = {
		progress: null, // for progress bar percentage
		multiVenueEnabled: false,
		venueSelectArray: [ '#saved_tribe_venue' ], //allow for reversion to primary + additional fields
		venueSelect: '#saved_tribe_venue',
		batchsize: 150, //default
		recurrence_warning_limit: 300, //default
		storedRecurrences: { origFormRecur: null, recurrences: null },
		showExclusions: venuecheck.show_exclusions ? venuecheck.show_exclusions : false,
		origForm: null,
		init() {
			vcObject.multiVenueEnabled = venuecheck.multivenue ? venuecheck.multivenue : false;

			vcObject.debugLog( 'In Multivenue mode? ', vcObject.multiVenueEnabled, typeof vcObject.multiVenueEnabled );
			vcObject.debugLog( 'venuecheck variables', venuecheck );

			// convert vars to numbers where necessary
			[ 'batchsize', 'recurrence_warning_limit' ].forEach( ( element ) => {
				venuecheck[ element ] = parseInt( venuecheck[ element ], 10 );
				if ( ! isNaN( venuecheck[ element ] ) ) {
					vcObject[ element ] = venuecheck[ element ];
				}
			} );

			if ( vcObject.multiVenueEnabled ) {
				if ( ! venuecheck.use_tec_fields ) {
					vcObject.venueSelect = '#acf-' + venuecheck.fieldkey;
					vcObject.venueSelectArray = [ vcObject.venueSelect ];
				} else {
					vcObject.venueSelectArray = [ '#saved_tribe_venue', '#venuecheck-additional-venues select' ];
					vcObject.venueSelect = vcObject.venueSelectArray.join( ', ' );
				}
			}

			window.addEventListener( 'load', ( e ) => {
				if ( venuecheck.debug ) console.log( 'load event fire', e );

				//=====FORM MODIFIED=====//

				// run 3s after load
				setTimeout( function() {
					const $form = $( 'form#post' );
					vcObject.origForm = $form.serialize();

					if ( venuecheck.debug ) {
						console.log( 'check form change status after 3 seconds' );
						console.log( 'is same as current state?', $form.serialize() === vcObject.origForm );
					}

					//removes the modified message when editing existing events
					$( document ).on(
						'change',
						'body.venuecheck-update #EventInfo :input,' +
							'body.venuecheck-update #EventInfo .tribe-dropdown,' +
							'body.venuecheck-update #EventInfo .tribe-button-field',
						function() {
							if ( $form.serialize() !== vcObject.origForm ) {
								vcObject.debugLog( 'form changed, show msg' );
								vcObject.venuecheck_show_modified_msg();
							} else {
								vcObject.debugLog( 'form changed, hide msg' );
								vcObject.venuecheck_hide_modified_msg();
							}
						}
					);

					//does not remove modified message for new events
					$( document ).on(
						'click',
						'body.venuecheck-update .tribe-row-delete-dialog .ui-dialog-buttonpane .ui-dialog-buttonset .button-red',
						function() {
							vcObject.venuecheck_show_modified_msg();
						}
					);
				}, 3000 );
			} ); //load

			// Setup additional required HTML elements and classes
			// It would be great to do this in PHP instead, but there is no way to modify the form

			// venue select
			vcObject.waitForElementToDisplay(
				vcObject.venueSelectArray[ 0 ],
				function() {
					vcObject.debugLog( vcObject.venueSelectArray[ 0 ] + ' is loaded' );
					vcObject.eventTribeVenueLoaded();
				},
				1000,
				9000
			);

			// wrapper for entire tribe event form
			vcObject.waitForElementToDisplay(
				'#tribe_events_event_details',
				function() {
					vcObject.debugLog( '#tribe_events_event_details is loaded' );
					vcObject.tribeEventsEventDetailsLoaded();
				},
				1000,
				9000
			);

			$( '#allDayCheckbox' ).click( function() {
				vcObject.venuecheck_show_hide_offsets();
			} );
		},

		tribeEventsEventDetailsLoaded() {
			const $eventDetails = $( '#tribe_events_event_details' );
			//add venuecheck
			$eventDetails.addClass( 'venuecheck-updated' );
		},

		eventTribeVenueLoaded() {
			vcObject.debugLog( 'eventTribeVenueLoaded' );

			// handle venue check link
			$( document ).on(
				'click',
				'#venuecheck-conflicts-button, #venuecheck-conflicts-link, #venuecheck-report-conflicts-link, #venuecheck-modified',
				function() {
					vcObject.venuecheck_find_available_venues();
				}
			);

			// $venuecheckVenueSection is the 1st tbody of the target table
			const $venuecheckVenueSection = vcObject.multiVenueEnabled
				? $( venuecheck.container_id + ' tbody' ).first()
				: $( '#event_tribe_venue tbody' ).first();

			// $venueDropdown is the last td in the 1st tr of the tbody
			const $venueDropdown = $venuecheckVenueSection.find( 'tr.saved-linked-post > td' ).last();

			if ( venuecheck.debug ) {
				console.log( '$venuecheckVenueSection', $venuecheckVenueSection );
				console.log( '$venueDropdown', $venueDropdown );
			}

			//add class to section
			$venuecheckVenueSection.addClass( 'venuecheck-section' );

			// add section label before first row of tbody
			$venuecheckVenueSection
				.children( 'tr' )
				.first()
				.before(
					'<tr>' +
						'<td colspan="2" class="venuecheck-section-label">' +
						'Venue Check<i class="fas fa-spinner fa-pulse venuecheck-preload"></i>' +
						'</td>' +
						'</tr>'
				);

			// wrap dropdown
			$venueDropdown.wrapInner( '<div id="venuecheck-venue-select"></div>' );

			// add conflicts button at end of dropdown cell, after our wrapper div
			$venueDropdown.append(
				'<a id="venuecheck-conflicts-button" class="button" tabindex="0" role="button">Find available venues</a>'
			);

			$venuecheckVenueSection
				.find( '.edit-linked-post-link' )
				.after(
					'<div id="venuecheck-change-venue" style="display: none;">' +
						'<a id="venuecheck-conflicts-link" class="button">Change Venue</a>' +
						'</div>'
				);

			if ( $( 'body' ).hasClass( 'venuecheck-new' ) ) {
				$( '#venuecheck-conflicts-button' ).show();
			} else if ( ! $( vcObject.venueSelect ).val().length ) {
				$( '#venuecheck-conflicts-button' ).css( 'display', 'inline-block' );
			} else {
				$( '#venuecheck-conflicts-button' ).hide();
			}

			//disable venues dropdown
			vcObject.venuecheck_toggle_readonly( true );
			$( vcObject.venueSelect ).prop( 'autocomplete', 'off' ); // not sure why, we aren't reenabling this anywhere

			// * firefox select refresh caching bugfix
			// https://stackoverflow.com/a/8258154/947370

			// empty out the link to edit the venue item
			//$( '.edit-linked-post-link' ).html( '' );
			$( '.edit-linked-post-link' ).hide();

			// show the change venue button
			$( '#venuecheck-change-venue' ).show();

			vcObject.venuecheck_show_hide_offsets();
			vcObject.venuecheck_show_hide_divider();
		},

		//=====FORM MODIFIED=====//

		venuecheck_check_stored_recurrences() {
			vcObject.debugLog( 'checking storedRecurrences', vcObject.storedRecurrences );
			if (
				vcObject.storedRecurrences &&
				vcObject.storedRecurrences.recurrences &&
				vcObject.storedRecurrences.origFormRecur === vcObject.get_recurrence_form_data()
			) {
				vcObject.venuecheck_disable_form();
				vcObject.venuecheck_hide_wait();
				if ( venuecheck.debug ) console.log( 'venuecheck_check_stored_recurrences have not changed' );
				vcObject.venuecheck_check_venues( vcObject.storedRecurrences.recurrences, vcObject.batchsize );
			} else {
				if ( venuecheck.debug )
					console.log(
						'recurrences stored but recurrence changed?',
						vcObject.storedRecurrences &&
							vcObject.storedRecurrences.origFormRecur &&
							vcObject.storedRecurrences.origFormRecur !== vcObject.get_recurrence_form_data()
					);

				const recurrenceFormData = vcObject.get_recurrence_form_data();
				vcObject.debugLog( 'recurrenceFormData', recurrenceFormData );
				vcObject.storedRecurrences.recurrences = null;
				vcObject.storedRecurrences.origFormRecur = recurrenceFormData;
				vcObject.debugLog( 'storing Recurrences', vcObject.storedRecurrences.origFormRecur );
				vcObject.venuecheck_get_event_recurrences();
			}
		},

		get_recurrence_form_data() {
			// get the form values from the date/time & recurrence sections, NOT including the setup time
			const recurrenceFormElements =
				'.recurrence-row input, .custom-recurrence-row input, .recurrence-row select, .custom-recurrence-row select,' +
				'.tribe-datetime-block input';
			const origForm = $( recurrenceFormElements ).serialize();
			vcObject.debugLog( 'getting recurrence form', origForm );
			return origForm;
		},

		venuecheck_get_event_recurrences() {
			const formVars = {};
			$.each( $( 'form#post' ).serializeArray(), function( i, field ) {
				formVars[ field.name ] = field.value;
			} );

			if ( $( '#allDayCheckbox' ).prop( 'checked' ) === true ) {
				formVars.EventStartTime = '00:00:00';
				formVars.EventEndTime = '23:59:59';
			}

			const start = formVars.EventStartTime;
			if ( venuecheck.debug ) console.log( 'start', start );
			const end = formVars.EventEndTime;
			const startTime = vcObject.venuecheck_convert_time( start );
			const endTime = vcObject.venuecheck_convert_time( end );

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

			vcObject.venuecheck_disable_form();

			if ( venuecheck.debug ) console.log( 'nonce: ' + venuecheck.nonce );

			// if event is recurring, send the recurrence data via ajax to get the array of recurring dates in return
			if ( typeof formVars[ 'is_recurring[]' ] !== 'undefined' ) {
				// show "getting recurrences" spinner
				vcObject.venuecheck_show_wait();
				if ( venuecheck.debug ) console.log( 'RECURRING EVENT' );
				return $.ajax( {
					type: 'POST',
					url: venuecheck.ajax_url,
					dataType: 'json',
					data: {
						action: 'venuecheck_get_event_recurrences',
						nonce: venuecheck.nonce,
						post_data,
					},
				} )
					.done( function( response ) {
						$.merge( event_recurrences, response );
						if ( venuecheck.debug ) {
							console.log( '=====/////RECURRENCES-RECURRING/////=====' );
							console.log( event_recurrences );
							console.log( '=====/////RECURRENCES-RECURRING/////=====' );
						}
						if ( event_recurrences.length > vcObject.recurrence_warning_limit ) {
							vcObject.venuecheck_hide_wait();
							const recurrences_num = event_recurrences.length;
							$( '#venuecheck-messages-container' ).addClass( 'has-messages' );
							$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).show();
							$( '#venuecheck-recurrence-count' ).text( recurrences_num );
							$( '#venuecheck-recurrence-warning-cancel' )
								.unbind()
								.click( function() {
									$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).hide();
									vcObject.venuecheck_enable_form();
									return false;
								} );
							$( '#venuecheck-recurrence-warning-continue' )
								.unbind()
								.click( function() {
									$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).hide();
									if ( venuecheck.debug ) console.log( 'get_event_recurrences recurring - post warning -> check_venues' );
									vcObject.venuecheck_check_venues( event_recurrences, vcObject.batchsize );
								} );
						} else {
							vcObject.venuecheck_hide_wait();
							if ( venuecheck.debug ) console.log( 'get_event_recurrences recurring - no warning -> check_venues' );
							vcObject.venuecheck_check_venues( event_recurrences, vcObject.batchsize );
						}
					} )
					.fail( function( jqXHR, textStatus, error ) {
						console.error( 'ajax error: ' + error );
					} );
			}

			if ( venuecheck.debug ) {
				console.log( '=====/////RECURRENCES/////=====' );
				console.log( event_recurrences );
				console.log( '=====/////RECURRENCES/////=====' );
			}

			// if the event is not recurring, we can call check_venues directly
			// hide "getting recurrences" spinner
			vcObject.venuecheck_hide_wait();

			if ( venuecheck.debug ) console.log( 'get_event_recurrences - not recurring -> check_venues' );

			vcObject.venuecheck_check_venues( event_recurrences, vcObject.batchsize );
		}, // end venuecheck_get_event_recurrences

		venue_check_ajax_call_combined( post_data ) {
			if ( venuecheck.debug ) console.log( 'RECURRING EVENT' );
			return $.ajax( {
				type: 'POST',
				url: venuecheck.ajax_url,
				dataType: 'json',
				data: {
					action: 'venuecheck_get_event_recurrences',
					nonce: venuecheck.nonce,
					post_data,
				},
			} )
				.done( function( response ) {
					//$.merge( event_recurrences, response );
					if ( venuecheck.debug ) {
						console.log( '=====/////CONFLICTS-RECURRING/////=====' );
						console.log( response );
						console.log( '=====/////CONFLICTS-RECURRING/////=====' );
					}

					if ( venuecheck.debug ) console.log( 'ajax_call_combined => handle_check_venues_response' );

					vcObject.venuecheck_handle_check_venues_response( response );
				} )
				.fail( function( jqXHR, textStatus, error ) {
					console.error( 'ajax error: ' + error );
				} );
		},

		venuecheck_get_event_recurrences_direct() {
			const formVars = {};
			$.each( $( 'form#post' ).serializeArray(), function( i, field ) {
				formVars[ field.name ] = field.value;
			} );

			if ( $( '#allDayCheckbox' ).prop( 'checked' ) === true ) {
				formVars.EventStartTime = '00:00:00';
				formVars.EventEndTime = '23:59:59';
			}

			const start = formVars.EventStartTime;
			if ( venuecheck.debug ) console.log( 'start', start );
			const end = formVars.EventEndTime;
			const startTime = vcObject.venuecheck_convert_time( start );
			const endTime = vcObject.venuecheck_convert_time( end );

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

			vcObject.venuecheck_disable_form();

			if ( venuecheck.debug ) console.log( 'nonce: ' + venuecheck.nonce );

			// if event is recurring, send the recurrence data via ajax to get the array of recurring dates in return
			if ( typeof formVars[ 'is_recurring[]' ] !== 'undefined' ) {
				// use event description to get number of recurrences
				let recurrences_num = '';
				let showWarning = false;
				const descriptionText = jQuery( '.tribe-event-recurrence-description' )[ 0 ].innerText;
				if ( descriptionText.includes( 'repeating indefinitely' ) ) {
					showWarning = true;
				} else {
					const startWord = 'happening';
					const endWord = 'times';
					let countStart = descriptionText.search( startWord );
					let countEnd = descriptionText.search( endWord );
					if ( countStart > 0 && countEnd > 0 ) {
						countStart += startWord.length;
						countEnd -= countStart;
						recurrences_num = descriptionText.substr( countStart, countEnd ).trim();
					}
				}
				vcObject.debugLog( 'recurrences_num', recurrences_num, 'showWarning', showWarning );
				if ( showWarning || recurrences_num > vcObject.recurrence_warning_limit ) {
					$( '#venuecheck-messages-container' ).addClass( 'has-messages' );
					$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).show();
					$( '#venuecheck-recurrence-count' ).text( recurrences_num );
					$( '#venuecheck-recurrence-warning-cancel' )
						.unbind()
						.click( function() {
							$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).hide();
							vcObject.venuecheck_enable_form();
							return false;
						} );
					$( '#venuecheck-recurrence-warning-continue' )
						.unbind()
						.click( function() {
							$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).hide();
							if ( venuecheck.debug )
								console.log( 'get_event_recurrences_direct recurring - warning -> check_ajax_combined' );
							vcObject.venuecheck_show_progress_bar();
							vcObject.venuecheck_check_venues_progress( 0, 100 );
							vcObject.venue_check_ajax_call_combined( post_data );
						} );
				} else {
					if ( venuecheck.debug ) console.log( 'get_event_recurrences_direct recurring - no warning -> check_ajax_combined' );
					vcObject.venuecheck_show_progress_bar();
					vcObject.venuecheck_check_venues_progress( 0, 100 );
					vcObject.venue_check_ajax_call_combined( post_data );
				}
			} else {
				if ( venuecheck.debug ) {
					console.log( '=====/////RECURRENCES/////=====' );
					console.log( event_recurrences );
					console.log( '=====/////RECURRENCES/////=====' );
				}

				// if the event is not recurring, we can call check_venues directly
				vcObject.venuecheck_hide_wait();

				if ( venuecheck.debug ) console.log( 'get_event_recurrences_direct - not recurring -> check_venues' );

				vcObject.venuecheck_check_venues( event_recurrences, vcObject.batchsize );
			}
		}, // end venuecheck_get_event_recurrences_direct

		/**
		 *
		 * ajax calls venuecheck_check_venues
		 *
		 * @param array event_recurrences
		 * @return event_conflicts
		 *
		 */

		venuecheck_check_venues( event_recurrences, batch_size ) {
			vcObject.venuecheck_show_progress_bar();

			vcObject.storedRecurrences.recurrences = event_recurrences;

			const postID = $( '#post_ID' ).val();
			// pre-split array into batchs
			const batchArray = [];
			for ( let i = 0; i < event_recurrences.length; i += batch_size ) {
				if ( venuecheck.debug ) console.log( 'venuecheck_check_venues i: ' + i );
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
						if ( venuecheck.debug ) console.log( 'nonce: ' + venuecheck.nonce );
						return $.ajax( {
							type: 'POST',
							dataType: 'json',
							url: venuecheck.ajax_url,
							data: {
								action: 'venuecheck_check_venues',
								nonce: venuecheck.nonce,
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
									vcObject.venuecheck_check_venues_progress( percent_current, percent_end );
								}
								vcObject.venuecheck_toggle_readonly( true );
							},
						} ).then( function( data ) {
							if ( venuecheck.debug ) console.log( 'venuecheck_check_venues ajax return data:', data );
							venuecheck_conflicts = venuecheck_conflicts.concat( data );
						} );
					} );
				}, Promise.resolve() )
				.then( function() {
					vcObject.venuecheck_handle_check_venues_response( venuecheck_conflicts );
				} );
		}, //venuecheck_check_venues

		venuecheck_handle_check_venues_response( conflicts ) {
			// flatten response array
			const result = Object.values(
				conflicts.reduce( function( a, curr ) {
					if ( ! a[ curr.venueTitle ] ) {
						// if the room is not present in map than add it.
						a[ curr.venueTitle ] = curr;
					} else {
						// if room exist than simply concat the reservations array of map and current element
						a[ curr.venueTitle ].events = a[ curr.venueTitle ].events.concat( curr.events );
						// add or merge the series listing
						if ( ! a[ curr.venueTitle ].series && curr.series ) {
							a[ curr.venueTitle ].series = curr.series;
						} else if ( a[ curr.venueTitle ].series && curr.series ) {
							a[ curr.venueTitle ].series = Object.assign( a[ curr.venueTitle ].series, curr.series );
						}
					}
					return a;
				}, {} )
			);

			if ( venuecheck.debug ) console.log( 'CONFLICTS', conflicts );

			conflicts = result;

			if ( venuecheck.debug ) console.log( 'CONFLICTS MERGED', conflicts );

			clearTimeout( vcObject.progress );
			$( '#venuecheck-progress .progress-bar span' ).css( {
				width: '100%',
			} );
			$( '.venuecheck-progress-percent-done' ).text( '100%' );

			setTimeout( function() {
				vcObject.venuecheck_check_venues_handler( conflicts );
			}, 500 );
		},

		/**
		 *
		 * updates progress bar percentage on ui
		 *
		 */

		//let progress;

		venuecheck_check_venues_progress( percent_current, percent_end ) {
			clearTimeout( vcObject.progress );

			if ( venuecheck.debug ) console.log( 'check_venues_progress percent: ' + percent_current );

			$( '#venuecheck-progress .progress-bar span' ).css( {
				width: percent_current + '%',
			} );
			$( '.venuecheck-progress-percent-done' ).text( percent_current + '%' );
			percent_current += Math.floor( Math.random() * 5 + 1 ); //randomize step size
			if ( percent_current <= percent_end ) {
				const timeout = Math.floor( Math.random() * 1500 + 300 ); //randomize step duration
				vcObject.progress = setTimeout( function() {
					vcObject.venuecheck_check_venues_progress( percent_current, percent_end );
				}, timeout );
			} else if ( percent_end === 100 ) {
				$( '#venuecheck-progress .progress-bar span' ).css( {
					width: '100%',
				} );
				$( '.venuecheck-progress-percent-done' ).text( '100%' );
			}
		},

		/**
		 * disables venue conflicts in venues menu
		 * creates report of events with conflicts
		 *
		 * @param {Array} venuecheck_conflicts
		 */
		venuecheck_check_venues_handler( venuecheck_conflicts ) {
			$( 'body' ).addClass( 'venuecheck-update' );
			$( '#venuecheck-conflicts-button' ).hide();

			if ( venuecheck.debug ) console.log( 'starting venuecheck_check_venues_handler' );

			const $venuecheck_venues = $( vcObject.venueSelect ).find( 'option, optgroup' );
			const venuecheck_venue_options = [ {} ];

			if ( venuecheck.debug ) console.log( 'venuecheck_venues', $venuecheck_venues );

			if ( ! vcObject.multiVenueEnabled ) {
				// remove the confusing double list from Modern Tribe ("My Venues" vs "Available Venues")
				$venuecheck_venues.each( function() {
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
			}

			//disable and message any venue venuecheck_conflicts
			let venuecheck_venue_report_count = '';
			let venuecheck_venue_report = '';
			let $venuecheck_venue_report = null;
			let $venuecheck_venue_report_exclusions = null;
			let count_exclusions = 0;
			const deselectedVenues = {};

			if ( typeof venuecheck_conflicts !== 'undefined' && venuecheck_conflicts.length !== 0 ) {
				// create the report container
				venuecheck_venue_report += '<div id="venuecheck-conflicts-report-container">';
				venuecheck_venue_report += '<div id="venuecheck-report-links">';
				venuecheck_venue_report += '<a id="venuecheck-report-conflicts-link">Recheck for Venue Conflicts</a>';
				venuecheck_venue_report += '<span class="venuecheck-divider">&nbsp;|&nbsp;</span>';
				venuecheck_venue_report += '<a id="venuecheck-conflicts-report-close">Close</a>';
				venuecheck_venue_report += '</div>';
				venuecheck_venue_report += '<table id="venuecheck-conflicts-report-table" class="venuecheck-conflicts-report-table">';
				venuecheck_venue_report += '</table></div>';

				$venuecheck_venue_report = $( venuecheck_venue_report );

				if ( venuecheck.debug ) console.log( 'venuecheck_conflicts', venuecheck_conflicts, $.type( venuecheck_conflicts ) );
				if ( venuecheck.debug ) console.log( 'venuecheck_venue_options', venuecheck_venue_options );

				// reset all options to enabled by default before we loop through.
				$( vcObject.venueSelect + ' option' ).attr( 'disabled', false );

				$.each( venuecheck_conflicts, function( index, venue ) {
					if ( venuecheck.debug ) console.log( 'venue:', index, venue.venueID, venue );

					if ( ! this.excluded ) {
						// disable the option in the dropdown
						const $thisOption = $( vcObject.venueSelect + ' option[value="' + venue.venueID + '"]' );
						$thisOption.attr( 'disabled', 'disabled' );
						// deselect the option in the dropdown
						if ( $thisOption[ 0 ].selected ) {
							deselectedVenues[ venue.venueID ] = venue.venueTitle; // in case we want to list these
						}
						$thisOption[ 0 ].selected = false;
					}

					// prepare venue report
					const $venuecheck_venue_report_entry = $( vcObject.generate_venue_report( venue ) );

					// now we have the complete report, sort series of recurring events & add recurring icon and info to first
					if ( this.series ) {
						const seriesVenueID = this.venueID;
						$.each( this.series, function() {
							const seriesClass = 'series-' + seriesVenueID + '-' + this.id;
							const $firstEvent = $venuecheck_venue_report_entry.find( '.' + seriesClass ).first();

							$firstEvent.addClass( 'first' );

							// if more than one event in the series, make an accordion
							const $otherEvents = $venuecheck_venue_report_entry.find( '.' + seriesClass + ':not(.first)' );
							if ( $otherEvents.length ) {
								$firstEvent.addClass( 'accordion' );
							}
							$firstEvent.attr( 'data-series', seriesClass );

							// add the recurring icon & recurrence info to the first in the series
							$firstEvent
								.find( '.venuecheck-conflicts-report-venue-date' )
								.prepend( '<i class="fa-sync-alt fas" aria-hidden="true"></i>' );
							$firstEvent
								.find( '.venuecheck-conflicts-report-venue-event a' )
								.after( '<span class="recurrence">' + this.recurrence + '</span>' );
							$firstEvent.after( $otherEvents );

							// hide the later events in the series
							$otherEvents.hide();
						} );
					}

					// if venues that are excluded from check, add them to separate report instead of main report
					if ( this.excluded ) {
						if ( vcObject.showExclusions ) {
							// create the exclusions report if we haven't previously
							if ( ! $venuecheck_venue_report_exclusions ) {
								$venuecheck_venue_report_exclusions = $(
									// eslint-disable-next-line max-len
									'<table id="venuecheck-exclusions-report-table" class="venuecheck-conflicts-report-table" style="display:none"></table>'
								);
							}
							$venuecheck_venue_report_exclusions.append( $venuecheck_venue_report_entry );
						}
						count_exclusions++;
					} else {
						$venuecheck_venue_report.find( '#venuecheck-conflicts-report-table' ).append( $venuecheck_venue_report_entry );
					}
				} );

				if ( ! vcObject.multiVenueEnabled ) {
					$( '#saved_tribe_venue' ).select2();
				} else {
					$( vcObject.venueSelect ).trigger( 'change' ); //@TODO maybe this would work the same as select2()
				}

				// calculate the count of unavailable and excluded venues & add to top of the report
				const venuecheck_conflicts_count = Object.keys( venuecheck_conflicts ).length - count_exclusions;

				venuecheck_venue_report_count += '<div id="venuecheck-conflicts-report-count" class="venuecheck-notice notice-info">';

				// add message if venues were deselected
				const deselectedCount = Object.keys( deselectedVenues ).length;
				if ( deselectedCount ) {
					const deselectedNames = Object.values( deselectedVenues );
					venuecheck_venue_report_count += '<div class="deselected-warning">';
					if ( deselectedCount > 2 ) {
						venuecheck_venue_report_count +=
							deselectedNames.slice( 0, -1 ).join( ', ' ) +
							', and ' +
							deselectedNames[ deselectedNames.length - 1 ] +
							' have';
					} else if ( deselectedCount === 2 ) {
						venuecheck_venue_report_count += deselectedNames.join( ' and ' ) + ' have';
					} else {
						venuecheck_venue_report_count += deselectedNames[ 0 ] + ' has';
					}
					venuecheck_venue_report_count +=
						' been deselected because you changed the date and time to conflict with an existing event in this venue.</div>';
				}

				// add count of unavailable venues & link to show full report
				venuecheck_venue_report_count += '<div class="count-unavailable"><span>';
				if ( venuecheck_conflicts_count ) {
					venuecheck_venue_report_count +=
						venuecheck_conflicts_count + ( venuecheck_conflicts_count === 1 ? ' unavailable venue.' : ' unavailable venues.' );
				} else {
					venuecheck_venue_report_count += 'All venues are available.';
				}
				venuecheck_venue_report_count += '</span><a id="venuecheck-conflicts-report-link">Show Details</a></div>';

				// add count of excluded venues
				if ( count_exclusions && vcObject.showExclusions ) {
					venuecheck_venue_report_count += '<div class="count-exclusions"><span>';
					venuecheck_venue_report_count += count_exclusions;
					venuecheck_venue_report_count +=
						count_exclusions === 1 ? ' venue is available but has ' : ' venues are available but have ';
					venuecheck_venue_report_count += 'overlapping bookings.</span>';
				}
				venuecheck_venue_report_count += '</div>';

				// if there are no conflicts found
			} else if ( venuecheck_conflicts.length === 0 ) {
				// notification
				venuecheck_venue_report_count +=
					'<div id="venuecheck-conflicts-report-count" class="venuecheck-notice notice-info">All venues are available.</div>';
				venuecheck_venue_report += '';

				// re-enable any previously disabled options
				$( vcObject.venueSelect + ' option' ).attr( 'disabled', false );
				if ( ! vcObject.multiVenueEnabled ) {
					$( '#saved_tribe_venue' ).select2();
				} else {
					$( vcObject.venueSelect ).trigger( 'change' ); //@TODO maybe this would work the same as select2()
				}
			}

			// add the report to the page
			$( '#venuecheck-messages' ).append( venuecheck_venue_report_count );
			$( '#venuecheck-conflicts-report' ).append( $venuecheck_venue_report );

			if ( count_exclusions ) {
				$( '#venuecheck-conflicts-report-container' ).append(
					'<div id="venuecheck-show-exclusions"><a href="#">' +
						'<span>Show</span> available venues with overlapping bookings</a></div>'
				);
				$( '#venuecheck-conflicts-report-container' ).append( $venuecheck_venue_report_exclusions );
			}

			$( '#venuecheck-conflicts-report' ).show();

			// bind click events on the report
			$( '#venuecheck-conflicts-report-link, #venuecheck-conflicts-report-close' ).on( 'click', function() {
				$( '#venuecheck-report-container' ).slideToggle( 'fast' );
				$( '#venuecheck-conflicts-report-link' ).html(
					$( '#venuecheck-conflicts-report-link' ).text() === 'Show Details' ? 'Hide Details' : 'Show Details'
				);
			} );

			$( 'tr.accordion .venuecheck-conflicts-report-venue-date i.fa-sync-alt.fas' ).on( 'click', function() {
				const seriesClass = $( this )
					.parents( 'tr.recurring.first' )
					.attr( 'data-series' );
				$( this )
					.parents( 'tr.recurring' )
					.toggleClass( 'open' );
				$( this )
					.parents( 'tbody' )
					.find( 'tr.recurring.' + seriesClass + ':not(.first)' )
					.toggle();
			} );

			$( '#venuecheck-show-exclusions a' ).on( 'click', function( e ) {
				e.preventDefault();
				const $exclusionsTable = $( '#venuecheck-exclusions-report-table' );
				const $this = $( this );
				if ( $exclusionsTable.is( ':visible' ) ) {
					$this.find( 'span' ).text( 'Show' );
					$exclusionsTable.hide();
				} else {
					$this.find( 'span' ).text( 'Hide' );
					$exclusionsTable.show();
				}
			} );

			// adjust the page state
			$( '#venuecheck-venue-select' ).show();

			$( '#venuecheck-processing, #venuecheck-progress' ).hide();

			$( '#venuecheck-conflicts-link' ).removeClass( 'venuecheck-disabled' );
			$( '#publish' ).prop( 'disabled', false );
			vcObject.venuecheck_toggle_readonly( false );
			$( '#venuecheck-change-venue' ).hide();
			$( 'body' ).addClass( 'venuecheck-venues' );
			vcObject.venuecheck_enable_form();
		}, // end venuecheck_handle_check_venues

		generate_venue_report( venue ) {
			const eventList = [];
			//prepare venue report
			let venuecheck_venue_report_entry =
				'<thead class="venuecheck-conflicts-report-venue-title"><tr><td colspan="2">' + venue.venueTitle + '</td></tr></thead>';
			venuecheck_venue_report_entry +=
				'<thead class="venuecheck-conflicts-report-venue-heading"><tr><td>Date</td><td>Event</td></tr></thead><tbody>';

			// loop through events attached to a venue
			$.each( venue.events, function( index2, event ) {
				// in extreme edge cases we could end up with duplicate events due to recurrence & batchin, so filter for those
				const recurrenceText = '';
				const prefixIcon = '';
				const id = 'event-' + venue.venueID + '-' + event.eventID;
				if ( ! eventList.includes( event.eventID ) ) {
					eventList.push( event.eventID );
					const eventID = event.eventID;

					if ( event.eventParent ) {
						event.eventClass = 'recurring';
						event.eventClass += ' series-' + venue.venueID + '-' + event.eventParent;
					} else if ( venue.series && venue.series.eventID ) {
						event.eventClass = 'recurring';
						event.eventClass += ' series-' + venue.venueID + '-' + eventID;
					}

					venuecheck_venue_report_entry +=
						'<tr id="' +
						id +
						'"class="' +
						event.eventClass +
						'"><td class="venuecheck-conflicts-report-venue-date">' +
						prefixIcon +
						event.eventDate +
						'</td><td class="venuecheck-conflicts-report-venue-event"><a href="' +
						event.eventLink +
						'" target="_blank" class="venuecheck-report-link"><span class="name">' +
						event.eventTitle +
						'</span><i class="fas fa-external-link-alt" aria-hidden="true"></i></a>' +
						recurrenceText +
						'</td></tr>';
				}
			} );

			return venuecheck_venue_report_entry;
		},

		venuecheck_convert_time( time ) {
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
		},

		venuecheck_show_hide_offsets() {
			if ( $( '#allDayCheckbox' ).prop( 'checked' ) === true ) {
				$( '#venuecheck-offsets' ).hide();
				$( '#_venuecheck_event_offset_start' ).val( '0' );
				$( '#_venuecheck_event_offset_end' ).val( '0' );
			} else {
				$( '#venuecheck-offsets' ).show();
			}
		},

		venuecheck_show_modified_msg() {
			$( '#venuecheck-messages-container, #venuecheck-modified-publish, #venuecheck-modified' ).show();
			$( '#venuecheck-report-container, #venuecheck-conflicts-report-count, #venuecheck-progress' ).hide();
			$( '#publish' ).prop( 'disabled', true );
			$( 'input#save-post' ).prop( 'disabled', true );
			vcObject.venuecheck_toggle_readonly( true );
			$( '#venuecheck-change-venue' ).show();
		},

		venuecheck_hide_modified_msg() {
			$( '#venuecheck-messages-container, #venuecheck-modified-publish, #venuecheck-modified' )
				.not( '.active' )
				.hide();
			$( '#venuecheck-messages-container.has-messages, #venuecheck-conflicts-report-count' ).show();
			$( '#publish' ).prop( 'disabled', false );
			$( 'input#save-post' ).prop( 'disabled', false );
			if ( $( 'body' ).hasClass( 'venuecheck-venues' ) ) {
				$( '#venuecheck-messages-container' ).show();
				$( '#venuecheck-report-container' ).hide();
				$( '#venuecheck-conflicts-report-link' ).text( 'Show Details' );
				//here
				vcObject.venuecheck_toggle_readonly( false );
			}
		},

		venuecheck_toggle_readonly( readonly ) {
			if ( readonly ) {
				$( vcObject.venueSelect )
					.prop( 'readonly', true )
					.addClass( 'readonly' );
			} else {
				$( vcObject.venueSelect )
					.prop( 'readonly', false )
					.removeClass( 'readonly' );
			}
		},

		venuecheck_show_wait() {
			$( '#venuecheck-messages-container' ).addClass( 'has-messages' );
			$( '#venuecheck-messages-container, #venuecheck-wait' ).show();
		},

		venuecheck_hide_wait() {
			$( '#venuecheck-messages-container' ).removeClass( 'has-messages' );
			$( '#venuecheck-messages-container, #venuecheck-wait' ).hide();
		},

		venuecheck_hide_messages() {
			$( '#venuecheck-conflicts-report-count, #venuecheck-conflicts-report-container' ).remove();
			$(
				'#venuecheck-report-container,' +
					'#venuecheck-messages-container,' +
					'#venuecheck-modified-publish,' +
					'#venuecheck-modified,' +
					'#venuecheck-conflicts-report'
			).hide();
			$( '#venuecheck-messages-container' ).removeClass( 'has-messages' );
		},

		venuecheck_disable_form() {
			$( vcObject.venueSelect )
				.prop( 'readonly', true )
				.addClass( 'readonly' )
				.addClass( 'venuecheck-preserve-disabled' );
			$( '.tribe-datetime-block :input:disabled' ).addClass( 'venuecheck-preserve-disabled' );
			$( '#publish' ).prop( 'disabled', true );
			$( 'input#save-post' ).prop( 'disabled', true );
			$( '.tribe-datetime-block :input' ).prop( 'disabled', true );
			$( '#tribe_events_event_details a' )
				.not(
					'#venuecheck-cancel, #venuecheck-recurrence-warning-continue, #venuecheck-recurrence-warning-cancel, .select2-choice'
				)
				.addClass( 'venuecheck-disabled' );
		},

		venuecheck_enable_form() {
			// sometimes we re-enable the form (e.g. after canceling the available venue lookup )
			// but the venue select should remain disabled, this is what .venuecheck-preserve-disabled is for
			for ( const venueId of vcObject.venueSelectArray ) {
				$( venueId + ':not(.venuecheck-preserve-disabled)' )
					.prop( 'readonly', false )
					.removeClass( 'readonly' );
			}

			$( '.tribe-datetime-block :input:not(.venuecheck-preserve-disabled)' ).prop( 'disabled', false );
			$( vcObject.venueSelect ).removeClass( 'venuecheck-preserve-disabled' );
			$( '.tribe-datetime-block :input' ).removeClass( 'venuecheck-preserve-disabled' );
			$( '#publish' ).prop( 'disabled', false );
			$( 'input#save-post' ).prop( 'disabled', false );
			$( '#tribe_events_event_details a' ).removeClass( 'venuecheck-disabled' );
			vcObject.origForm = $( 'form#post' ).serialize();
		},

		venuecheck_show_progress_bar() {
			$( '#venuecheck-progress .progress-bar span' ).css( {
				width: '0%',
			} );
			$( '.venuecheck-progress-percent-done' ).text( '0%' );
			$( '#venuecheck-messages-container, #venuecheck-progress' ).show();
			// venuecheck_check_venues_progress();
		},

		venuecheck_find_available_venues() {
			vcObject.venuecheck_hide_messages();
			// for testing add ability to switch between splitting the ajax calls (original way) and doing them all at once
			if ( venuecheck.combine_ajax === '1' ) {
				vcObject.debugLog( 'find_available_venues -> get_event_recurrences_direct' );
				vcObject.venuecheck_get_event_recurrences_direct();
			} else {
				vcObject.debugLog( 'find_available_venues -> check_stored_recurrences' );
				vcObject.venuecheck_show_wait();
				vcObject.venuecheck_check_stored_recurrences(); // check if we have a current version of recurrences
				//vcObject.venuecheck_get_event_recurrences();
			}
		},

		venuecheck_show_hide_divider() {
			if ( $( '#saved_tribe_venue' ).val() === '' ) {
				$( '#venuecheck-change-venue .venuecheck-divider' ).hide();
			} else {
				$( '#venuecheck-change-venue .venuecheck-divider' ).show();
			}
		},

		debugLog( $a, $b = '' ) {
			if ( venuecheck.debug ) {
				console.log( $a, $b );
			}
		},

		waitForElementToDisplay( selector, callback, checkFrequencyInMs, timeoutInMs ) {
			const startTimeInMs = Date.now();
			( function loopSearch() {
				if ( document.querySelector( selector ) !== null ) {
					callback();
				} else {
					setTimeout( function() {
						if ( timeoutInMs && Date.now() - startTimeInMs > timeoutInMs ) return;
						loopSearch();
					}, checkFrequencyInMs );
				}
			} )();
		},
	};
	vcObject.init();
} );
