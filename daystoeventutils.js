const DaysToEventUtils = {

	/**
	 * Build the single-line countdown label for an event tile.
	 * @param {object} startMoment moment for the event start
	 * @param {object} nowMoment moment for "now"
	 * @returns {string} the label text ("Today", "Tomorrow", or "IN N DAYS")
	 */
	countdownLabel (startMoment, nowMoment) {
		const days = startMoment.clone().startOf("day").diff(nowMoment.clone().startOf("day"), "days");

		// days <= 0 covers today and events already in progress (multi-day events past their start).
		if (days <= 0) {
			return "Today";
		}
		if (days === 1) {
			return "Tomorrow";
		}
		return `IN ${days} DAYS`;
	},

	/**
	 * For a multi-day event, return a moment for its last calendar day; for a
	 * single-day event, return null. All-day events use an exclusive end date
	 * (DTEND is the day after the event), so their last day is end minus one day.
	 * @param {object} startMoment moment for the event start
	 * @param {object} endMoment moment for the event end
	 * @param {boolean} fullDayEvent whether the event is an all-day event
	 * @returns {(object|null)} moment for the last day if multi-day, else null
	 */
	multiDayLastDay (startMoment, endMoment, fullDayEvent) {
		const lastDay = fullDayEvent ? endMoment.clone().subtract(1, "day") : endMoment.clone();
		if (lastDay.clone().startOf("day").isAfter(startMoment.clone().startOf("day"))) {
			return lastDay;
		}
		return null;
	}
};

if (typeof module !== "undefined") {
	module.exports = DaysToEventUtils;
}
