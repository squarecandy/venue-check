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
		batchsize: venuecheck.batchsize,
		recurrence_warning_limit: venuecheck.recurrence_warning_limit,
		storedRecurrences: { origForm: null, recurrences: null },
		init() {
			vcObject.multiVenueEnabled = venuecheck.multivenue ? venuecheck.multivenue : false;

			vcObject.debugLog( 'In Multivenue mode? ' + vcObject.multiVenueEnabled );
			vcObject.debugLog( 'venuecheck variables', venuecheck );

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
					const origForm = $form.serialize();

					if ( venuecheck.debug ) {
						console.log( 'check form change status after 3 seconds' );
						console.log( 'is origForm same as current state?', $form.serialize() === origForm );
					}

					//removes the modified message when editing existing events
					$( document ).on(
						'change',
						'body.venuecheck-update #EventInfo :input,' +
							'body.venuecheck-update #EventInfo .tribe-dropdown,' +
							'body.venuecheck-update #EventInfo .tribe-button-field',
						function() {
							if ( $form.serialize() !== origForm ) {
								vcObject.venuecheck_show_modified_msg();
							} else {
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
					console.log( vcObject.venueSelectArray[ 0 ] + ' is loaded' );
					vcObject.eventTribeVenueLoaded();
				},
				1000,
				9000
			);

			// wrapper for entire tribe event form
			vcObject.waitForElementToDisplay(
				'#tribe_events_event_details',
				function() {
					console.log( '#tribe_events_event_details is loaded' );
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
			console.log( 'eventTribeVenueLoaded' );

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
			$venueDropdown.append( '<a id="venuecheck-conflicts-button" class="button">Find available venues</a>' );

			$venuecheckVenueSection
				.find( '.edit-linked-post-link' )
				.after(
					'<div id="venuecheck-change-venue" style="display: none;">' +
						'<a id="venuecheck-conflicts-link" class="button">Change Venue</a>' +
						'</div>'
				);

			if ( $( 'body' ).hasClass( 'venuecheck-new' ) ) {
				$( '#venuecheck-conflicts-button' ).show();
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
			console.log( 'checking storedRecurrences', vcObject.storedRecurrences );
			if (
				vcObject.storedRecurrences &&
				vcObject.storedRecurrences.recurrences &&
				vcObject.storedRecurrences.origForm === vcObject.get_recurrence_form_data()
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
							vcObject.storedRecurrences.origForm &&
							vcObject.storedRecurrences.origForm !== vcObject.get_recurrence_form_data()
					);

				const recurrenceFormData = vcObject.get_recurrence_form_data();
				console.log( 'recurrenceFormData', recurrenceFormData );
				vcObject.storedRecurrences.recurrences = null;
				vcObject.storedRecurrences.origForm = recurrenceFormData;
				console.log( 'storing Recurrences', vcObject.storedRecurrences.origForm );
				vcObject.venuecheck_get_event_recurrences();
			}
		},

		get_recurrence_form_data() {
			// get the form values from the date/time & recurrence sections
			const recurrenceFormElements =
				'.recurrence-row input, .custom-recurrence-row input, .recurrence-row select, .custom-recurrence-row select,' +
				'.tribe-datetime-block input';
			const origForm = $( recurrenceFormElements ).serialize();
			console.log( 'getting recurrence form', origForm );
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
			if ( typeof formVars[ 'is_recurring[]' ] !== 'undefined' ) {
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
							const recurrrences_num = event_recurrences.length;
							$( '#venuecheck-messages-container' ).addClass( 'has-messages' );
							$( '#venuecheck-messages-container, #venuecheck-recurrence-warning' ).show();
							$( '#venuecheck-recurrence-count' ).text( recurrrences_num );
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
									if ( venuecheck.debug ) console.log( 'venuecheck_check_venues 1' );
									vcObject.venuecheck_check_venues( event_recurrences, vcObject.batchsize );
								} );
						} else {
							vcObject.venuecheck_hide_wait();
							if ( venuecheck.debug ) console.log( 'venuecheck_check_venues 2' );
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

			vcObject.venuecheck_hide_wait();

			if ( venuecheck.debug ) console.log( 'venuecheck_check_venues 3' );

			vcObject.venuecheck_check_venues( event_recurrences, vcObject.batchsize );
		}, // end venuecheck_get_event_recurrences

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
					// flatten response array
					const result = Object.values(
						venuecheck_conflicts.reduce( function( a, curr ) {
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

					if ( venuecheck.debug ) console.log( 'CONFLICTS', venuecheck_conflicts );

					venuecheck_conflicts = result;
					window.venueConflicts = venuecheck_conflicts;

					if ( venuecheck.debug ) console.log( 'CONFLICTS MERGED', venuecheck_conflicts );

					clearTimeout( vcObject.progress );
					$( '#venuecheck-progress .progress-bar span' ).css( {
						width: '100%',
					} );
					$( '.venuecheck-progress-percent-done' ).text( '100%' );

					setTimeout( function() {
						vcObject.venuecheck_check_venues_handler( venuecheck_conflicts );
					}, 500 );
				} );
		}, //venuecheck_check_venues

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

				if ( venuecheck.debug ) console.log( 'venuecheck_conflicts', venuecheck_conflicts, $.type( venuecheck_conflicts ) );
				if ( venuecheck.debug ) console.log( 'venuecheck_venue_options', venuecheck_venue_options );

				// reset all options to enabled by default before we loop through.
				//$( '#saved_tribe_venue option' ).removeAttr( 'disabled' );

				$( vcObject.venueSelect + ' option' ).removeAttr( 'disabled' ); //@TODO wont work with repeaters

				$.each( venuecheck_conflicts, function( index, venue ) {
					if ( venuecheck.debug ) console.log( index, venue.venueID, venue );

					const eventList = [];

					// disable the option
					$( vcObject.venueSelect + ' option[value="' + venue.venueID + '"]' )
						.attr( 'disabled', 'disabled' )
						.removeAttr( 'selected' );

					//prepare venue report
					venuecheck_venue_report +=
						'<thead class="venuecheck-conflicts-report-venue-title"><tr><td colspan="2">' +
						venue.venueTitle +
						'</td></tr></thead>';
					venuecheck_venue_report +=
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

							venuecheck_venue_report +=
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
				} );

				if ( ! vcObject.multiVenueEnabled ) {
					$( '#saved_tribe_venue' ).select2();
				}

				venuecheck_venue_report += '</tbody></table></div>';
			} else if ( venuecheck_conflicts.length === 0 ) {
				// there are no conflicts found

				// notification
				venuecheck_venue_report_count +=
					'<div id="venuecheck-conflicts-report-count" class="notice notice-info">All venues are available.</div>';
				venuecheck_venue_report += '';

				// re-enable any previously disabled options
				$( vcObject.venueSelect + ' option' ).removeAttr( 'disabled' );
				if ( ! vcObject.multiVenueEnabled ) {
					$( '#saved_tribe_venue' ).select2();
				}
			}

			$( '#venuecheck-messages' ).append( venuecheck_venue_report_count );
			$( '#venuecheck-conflicts-report' )
				.append( venuecheck_venue_report )
				.show();

			// loop through the venues again to sort series of recurring events
			$.each( venuecheck_conflicts, function() {
				console.log( 'SERIES1', this );
				if ( this.series ) {
					const seriesVenueID = this.venueID;
					$.each( this.series, function() {
						console.log( 'SERIES', this );
						const seriesClass = 'series-' + seriesVenueID + '-' + this.id;
						console.log( 'SERIES CLASS', seriesClass );
						const $firstEvent = $( '.' + seriesClass ).first();
						console.log( $firstEvent );
						$firstEvent.addClass( 'first' );

						const $otherEvents = $( '.' + seriesClass + ':not(.first)' );
						$firstEvent.attr( 'data-series', seriesClass );
						$firstEvent
							.find( '.venuecheck-conflicts-report-venue-date' )
							.prepend( '<i class="fa-sync-alt fas" aria-hidden="true"></i>' );
						$firstEvent
							.find( '.venuecheck-conflicts-report-venue-event a' )
							.after( '<span class="recurrence">' + this.recurrence + '</span>' );
						$firstEvent.after( $otherEvents );
						$otherEvents.hide();
					} );
				}
			} );

			$( '#venuecheck-conflicts-report-link, #venuecheck-conflicts-report-close' ).on( 'click', function() {
				$( '#venuecheck-report-container' ).slideToggle( 'fast' );
				$( '#venuecheck-conflicts-report-link' ).html(
					$( '#venuecheck-conflicts-report-link' ).text() === 'Show Details' ? 'Hide Details' : 'Show Details'
				);
			} );

			$( '.venuecheck-conflicts-report-venue-date i.fa-sync-alt.fas' ).on( 'click', function() {
				const seriesClass = $( this )
					.parents( 'tr.recurring.first' )
					.attr( 'data-series' );
				console.log( 'others', 'tr.recurring.' + seriesClass + ':not(.first)' );
				$( this )
					.parents( '#venuecheck-conflicts-report-table tbody' )
					.find( 'tr.recurring.' + seriesClass + ':not(.first)' )
					.toggle();
			} );

			$( '#venuecheck-venue-select' ).show();

			$( '#venuecheck-processing, #venuecheck-progress' ).hide();

			$( '#venuecheck-conflicts-link' ).removeClass( 'venuecheck-disabled' );
			$( '#publish' ).prop( 'disabled', false );
			vcObject.venuecheck_toggle_readonly( false );
			$( '#venuecheck-change-venue' ).hide();
			$( 'body' ).addClass( 'venuecheck-venues' );
			vcObject.venuecheck_enable_form();
		}, // end venuecheck_handle_check_venues

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
			vcObject.venuecheck_toggle_readonly( true );
			$( '#venuecheck-change-venue' ).show();
		},

		venuecheck_hide_modified_msg() {
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
				vcObject.venuecheck_toggle_readonly( false );
			}
		},

		venuecheck_toggle_readonly( readonly ) {
			console.log( 'readonly' );
			//console.log( vcObject.venueSelect );
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
				console.log( venueId + ':not(.venuecheck-preserve-disabled)' );
				$( venueId + ':not(.venuecheck-preserve-disabled)' )
					.prop( 'readonly', false )
					.removeClass( 'readonly' );
			}
			/*$( '#saved_tribe_venue:not(.venuecheck-preserve-disabled)' )
			.prop( 'readonly', false )
			.removeClass( 'readonly' );*/
			$( '.tribe-datetime-block :input:not(.venuecheck-preserve-disabled)' ).prop( 'disabled', false );
			//$( '#saved_tribe_venue, .tribe-datetime-block :input' ).removeClass( 'venuecheck-preserve-disabled' );
			$( vcObject.venueSelect ).removeClass( 'venuecheck-preserve-disabled' );
			$( '.tribe-datetime-block :input' ).removeClass( 'venuecheck-preserve-disabled' );
			$( '#publish' ).prop( 'disabled', false );
			$( '#tribe_events_event_details a' ).removeClass( 'venuecheck-disabled' );
			// const origForm = $( 'form#post' ).serialize();
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
			vcObject.venuecheck_show_wait();
			//vcObject.venuecheck_get_event_recurrences();
			vcObject.venuecheck_check_stored_recurrences();
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
