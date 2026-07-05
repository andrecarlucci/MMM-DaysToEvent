const DaysToEventUtils = {

	/**
	 * Build the countdown label for an event tile.
	 * @param {object} startMoment moment for the event start
	 * @param {object} nowMoment moment for "now"
	 * @returns {{value: string, unit: (string|null), isWord: boolean}} the label parts
	 */
	countdownLabel (startMoment, nowMoment) {
		const days = startMoment.clone().startOf("day").diff(nowMoment.clone().startOf("day"), "days");

		// days <= 0 covers today and events already in progress (multi-day events past their start).
		if (days <= 0) {
			return { value: "Today", unit: null, isWord: true };
		}
		if (days === 1) {
			return { value: "Tomorrow", unit: null, isWord: true };
		}
		return { value: String(days), unit: "days", isWord: false };
	}
};

if (typeof module !== "undefined") {
	module.exports = DaysToEventUtils;
}
