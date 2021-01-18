<?php
/**
 * CIS
 * Create a new class Tribe__Events__Pro__Recurrence1
 * it inherits class Tribe__Events__Pro__Recurrence
 * create our custom function get_dates for getting dates
 */
class Tribe__Events__Pro__Recurrence1 extends Tribe__Events__Pro__Recurrence
{
    const NO_END = -1;
    private $start_date;
    private $duration;
    private $end;
    /** @var Tribe__Events__Pro__Date_Series_Rules__Rules_Interface */
    public $series_rules;
    private $by_occurrence_count;
    private $event;
    private $minDate = 0;
    private $maxDate = 2147483647; // Y2K38, an arbitrary limit. TODO: revisit this in twenty years
    private $last_request_constrained = false;

    public function __construct($start_date, $end, $series_rules, $by_occurrence_count = false, $event = null, $start_time = null, $duration = null)
    {
        $this->start_date = $start_date;
        $this->end = $end;
        $this->series_rules = $series_rules;
        $this->by_occurrence_count = $by_occurrence_count;
        $this->event = $event;
        $this->start_time = $start_time;
        $this->duration = $duration;
    }

    /*CIS
    get_recurrence_parameters function is a custom function
    it is created by taking reference of get_recurrence_for_event function inside (/events-calendar-pro/src/Tribe/Recurrence/meta.php line 1082)
    I created this custom function get_recurrence_parameters in place of directly using get_recurrence_for_event because get_recurrence_for_event works on event id and get some data from databse using event id
    while we dont have event id we are working on ajax that is why I created it custom.

     */
    public static function get_recurrence_parameters($recurrence, $duration, $enddate, $startdate, $EventAllDay)
    {
        $custom_type = 'none';
        $start_time = null;
        $recurrenceParameters = array();
        $recurrenceParameters['start-time'] = $start_time;
        $recurrenceParameters['duration'] = $duration;
        $recurrenceParameters['by-occurrence-count'] = false;
        if (isset($recurrence['type'])) {
            $custom_type = Tribe__Events__Pro__Recurrence__Custom_Types::to_key($recurrence['type']);
        }

        if (
            empty($recurrence['custom'][$custom_type]['same-time'])
            && isset($recurrence['custom']['start-time'])
            && isset($recurrence['custom']['duration'])
        ) {
            $start_time = "{$recurrence['custom']['start-time']['hour']}:{$recurrence['custom']['start-time']['minute']}:00";
            $start_time .= isset($recurrence['custom']['start-time']['meridian']) ? " {$recurrence['custom']['start-time']['meridian']}" : '';
            $duration = Tribe__Events__Pro__Recurrence__Meta::get_duration_in_seconds($recurrence['custom']['duration']);
            $recurrenceParameters['start-time'] = $start_time;
            $recurrenceParameters['duration'] = $duration;
        } elseif (
            isset($recurrence['custom']['start-time'])
            && !is_array($recurrence['custom']['start-time'])
            && isset($recurrence['custom']['end-time'])
            && isset($recurrence['custom']['end-day'])
        ) {
            $start_time_in_seconds = strtotime($recurrence['custom']['start-time']);
            $start_time = date('H:i:s', $start_time_in_seconds);

            $end_time_in_seconds = strtotime($recurrence['custom']['end-time']);
            $end_time = date('H:i:s', $end_time_in_seconds);

            $duration = $end_time_in_seconds - $start_time_in_seconds;

            $recurrenceParameters['start-time'] = $start_time;
            $recurrenceParameters['duration'] = $duration;

            if (is_numeric($recurrence['custom']['end-day'])) {
                $duration += $recurrence['custom']['end-day'] * DAY_IN_SECONDS;
                $recurrenceParameters['duration'] = $duration;
            }
        }
        // Look out for instances inheriting the same time as the parent, where the parent is an all day event
        if (
            isset($recurrence['custom']['same-time'])
            && 'yes' === $recurrence['custom']['same-time']
            && 'yes' === $EventAllDay
        ) { //echo 'all event';
            // In the current implementation, events are considered "all day"
            // when their length is 1 second short of being 24hrs in duration.
            // We need to factor this in as follows to preserve duration
            // of multiday all-day events
            $parent_end_date = strtotime($enddate . ' 23:59:59');
            $parent_start_date = strtotime($startdate . '00:00:00');
            $diff = $parent_end_date - $parent_start_date;
            $num_days = absint($diff / DAY_IN_SECONDS) + 1;
            $duration = ($num_days * DAY_IN_SECONDS) - 1;
        }

        $recurrenceParameters['duration'] = $duration;
        /*CIS GET End count*/
        $is_after = false;

        if (isset($recurrence['end-type'])) {
            switch ($recurrence['end-type']) {
                case 'On':
                    $end = strtotime(tribe_end_of_day($recurrence['end']));
                    break;
                case 'Never':
                    $end = Tribe__Events__Pro__Recurrence::NO_END;
                    break;
                case 'After':
                default:
                    $end = $recurrence['end-count'] - 1; // subtract one because event is first occurrence
                    $is_after = true;
                    $recurrenceParameters['by-occurrence-count'] = true;
                    break;
            }
        } else {
            $end = Tribe__Events__Pro__Recurrence::NO_END;
        }
        $recurrenceParameters['end'] = $end;
        return $recurrenceParameters;
    }
}
