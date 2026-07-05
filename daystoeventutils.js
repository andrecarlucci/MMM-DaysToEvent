const DaysToEventUtils = {

	/**
	 * Describe the countdown for an event tile. Presentation (fonts, "IN … DAYS"
	 * wording) is left to the renderer.
	 * @param {object} startMoment moment for the event start
	 * @param {object} nowMoment moment for "now"
	 * @returns {{kind: string, days: (number|undefined)}} "today", "tomorrow", or "relative" with a day count
	 */
	countdownLabel (startMoment, nowMoment) {
		const days = startMoment.clone().startOf("day").diff(nowMoment.clone().startOf("day"), "days");

		// days <= 0 covers today and events already in progress (multi-day events past their start).
		if (days <= 0) {
			return { kind: "today" };
		}
		if (days === 1) {
			return { kind: "tomorrow" };
		}
		return { kind: "relative", days };
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
