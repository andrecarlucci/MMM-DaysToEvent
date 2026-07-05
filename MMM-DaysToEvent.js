/* global CalendarUtils, DaysToEventUtils */

Module.register("MMM-DaysToEvent", {
	// Define module defaults
	defaults: {
		maximumEntries: 10, // Total maximum tiles to show
		maximumNumberOfDays: 365,
		pastDaysCount: 0,
		maxTitleLength: 45,
		dateFormat: "ddd - MMM Do",
		marginTop: 0, // Outer margins (px) around the grid, per side
		marginRight: 0,
		marginBottom: 0,
		marginLeft: 0,

		fetchInterval: 60 * 60 * 1000, // Update every hour
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25, // Start fading at 1/4th of the list
		hidePrivate: false,
		hideOngoing: false,
		hideDuplicates: true,
		calendars: [
			{
				url: "https://www.calendarlabs.com/templates/ical/US-Holidays.ics"
			}
		],
		excludedEvents: [],
		broadcastPastEvents: false,
		selfSignedCert: false,
		updateOnFetch: true
	},

	// Define required scripts.
	getStyles () {
		return ["calendar.css"];
	},

	// Define required scripts.
	getScripts () {
		return ["calendarutils.js", "daystoeventutils.js", "moment.js", "moment-timezone.js"];
	},

	// Define required translations.
	getTranslations () {

		/*
		 * The translations for the default modules are defined in the core translation files.
		 * Therefore we can just return false. Otherwise we should have returned a dictionary.
		 * If you're trying to build your own module including translations, check out the documentation.
		 */
		return false;
	},

	// Override start method.
	start () {
		Log.info(`Starting module: ${this.name}`);

		// Set locale.
		moment.updateLocale(config.language, CalendarUtils.getLocaleSpecification(config.timeFormat));

		// clear data holder before start
		this.calendarData = {};

		// indicate no data available yet
		this.loaded = false;

		// data holder of calendar url. Avoid fade out/in on updateDom (one for each calendar update)
		this.calendarDisplayer = {};

		this.config.calendars.forEach((calendar) => {
			calendar.url = calendar.url.replace("webcal://", "http://");

			const calendarConfig = {
				maximumEntries: calendar.maximumEntries,
				maximumNumberOfDays: calendar.maximumNumberOfDays,
				pastDaysCount: calendar.pastDaysCount,
				broadcastPastEvents: calendar.broadcastPastEvents,
				selfSignedCert: calendar.selfSignedCert,
				excludedEvents: calendar.excludedEvents,
				fetchInterval: calendar.fetchInterval
			};

			if (typeof calendar.symbolClass === "undefined" || calendar.symbolClass === null) {
				calendarConfig.symbolClass = "";
			}
			if (typeof calendar.titleClass === "undefined" || calendar.titleClass === null) {
				calendarConfig.titleClass = "";
			}
			if (typeof calendar.timeClass === "undefined" || calendar.timeClass === null) {
				calendarConfig.timeClass = "";
			}

			// we check user and password here for backwards compatibility with old configs
			if (calendar.user && calendar.pass) {
				Log.warn("[calendar] Deprecation warning: Please update your calendar authentication configuration.");
				Log.warn("https://docs.magicmirror.builders/modules/calendar.html#configuration-options");
				calendar.auth = {
					user: calendar.user,
					pass: calendar.pass
				};
			}

			/*
			 * tell helper to start a fetcher for this calendar
			 * fetcher till cycle
			 */
			this.addCalendar(calendar.url, calendar.auth, calendarConfig);
		});

		this.selfUpdate();
	},

	notificationReceived (notification, payload) {
		if (notification === "FETCH_CALENDAR") {
			this.sendSocketNotification(notification, { url: payload.url, id: this.identifier });
		}
	},

	// Override socket notification handler.
	socketNotificationReceived (notification, payload) {

		if (this.identifier !== payload.id) {
			return;
		}

		if (notification === "CALENDAR_EVENTS") {
			// have we received events for this url
			if (!this.calendarData[payload.url]) {
				// no, setup the structure to hold the info
				this.calendarData[payload.url] = { events: null, checksum: null };
			}
			// save the event list
			this.calendarData[payload.url].events = payload.events;

			this.error = null;
			this.loaded = true;

			// if the checksum is the same
			if (this.calendarData[payload.url].checksum === payload.checksum) {
				// then don't update the UI
				return;
			}
			// haven't seen or the checksum is different
			this.calendarData[payload.url].checksum = payload.checksum;

			if (!this.config.updateOnFetch) {
				if (this.calendarDisplayer[payload.url] === undefined) {
					// calendar will never displayed, so display it
					this.updateDom(this.config.animationSpeed);
					// set this calendar as displayed
					this.calendarDisplayer[payload.url] = true;
				} else {
					Log.debug("[calendar] DOM not updated waiting self update()");
				}
				return;
			}
		} else if (notification === "CALENDAR_ERROR") {
			let error_message = this.translate(payload.error_type);
			this.error = this.translate("MODULE_CONFIG_ERROR", { MODULE_NAME: this.name, ERROR: error_message });
			this.loaded = true;
		}

		this.updateDom(this.config.animationSpeed);
	},

	// Override dom generator.
	getDom () {
		const events = this.createEventList(true);
		const wrapper = document.createElement("div");
		wrapper.className = "daystoevent-grid";
		wrapper.style.margin = `${this.config.marginTop}px ${this.config.marginRight}px ${this.config.marginBottom}px ${this.config.marginLeft}px`;

		if (this.error) {
			wrapper.innerHTML = this.error;
			wrapper.className = "daystoevent-grid dimmed";
			return wrapper;
		}

		if (events.length === 0) {
			wrapper.innerHTML = this.loaded ? this.translate("EMPTY") : this.translate("LOADING");
			wrapper.className = "daystoevent-grid dimmed";
			return wrapper;
		}

		let startFade;
		let fadeSteps;
		if (this.config.fade && this.config.fadePoint < 1) {
			if (this.config.fadePoint < 0) this.config.fadePoint = 0;
			startFade = events.length * this.config.fadePoint;
			fadeSteps = events.length - startFade;
		}

		const now = moment();

		events.forEach((event, index) => {
			const startMoment = this.timestampToMoment(event.startDate);

			const tile = document.createElement("div");
			tile.className = "daystoevent-tile";

			const countdown = DaysToEventUtils.countdownLabel(startMoment, now);
			const countEl = document.createElement("div");
			if (countdown.isWord) {
				countEl.className = "daystoevent-count word";
				countEl.innerHTML = countdown.value;
			} else {
				countEl.className = "daystoevent-count";
				const number = document.createElement("div");
				number.className = "daystoevent-number";
				number.innerHTML = countdown.value;
				const unit = document.createElement("div");
				unit.className = "daystoevent-unit";
				unit.innerHTML = countdown.unit;
				countEl.appendChild(number);
				countEl.appendChild(unit);
			}
			tile.appendChild(countEl);

			const title = document.createElement("div");
			title.className = "daystoevent-title";
			title.innerHTML = CalendarUtils.shorten(event.title, this.config.maxTitleLength);
			tile.appendChild(title);

			const date = document.createElement("div");
			date.className = "daystoevent-date";
			date.innerHTML = startMoment.format(this.config.dateFormat);
			tile.appendChild(date);

			if (this.config.fade && index >= startFade) {
				tile.style.opacity = 1 - (1 / fadeSteps) * (index - startFade);
			}

			wrapper.appendChild(tile);
		});

		return wrapper;
	},

	/**
	 * converts the given timestamp to a moment with a timezone
	 * @param {number} timestamp timestamp from an event
	 * @returns {moment.Moment} moment with a timezone
	 */
	timestampToMoment (timestamp) {
		return moment(timestamp, "x").tz(moment.tz.guess());
	},

	/**
	 * Creates the sorted list of all events.
	 * @param {boolean} limitNumberOfEntries Whether to filter returned events for display.
	 * @returns {object[]} Array with events.
	 */
	createEventList (limitNumberOfEntries) {
		let now = moment();
		let future = now.clone().startOf("day").add(this.config.maximumNumberOfDays, "days");

		let events = [];

		for (const calendarUrl in this.calendarData) {
			const calendar = this.calendarData[calendarUrl].events;
			let remainingEntries = this.maximumEntriesForUrl(calendarUrl);
			let maxPastDaysCompare = now.clone().subtract(this.maximumPastDaysForUrl(calendarUrl), "days");
			let by_url_calevents = [];
			for (const e in calendar) {
				const event = JSON.parse(JSON.stringify(calendar[e])); // clone object
				const eventStartDateMoment = this.timestampToMoment(event.startDate);
				const eventEndDateMoment = this.timestampToMoment(event.endDate);

				if (this.config.hidePrivate && event.class === "PRIVATE") {
					// do not add the current event, skip it
					continue;
				}
				if (limitNumberOfEntries) {
					if (eventEndDateMoment.isBefore(maxPastDaysCompare)) {
						continue;
					}
					if (this.config.hideOngoing && eventStartDateMoment.isBefore(now)) {
						continue;
					}
					if (this.config.hideDuplicates && this.listContainsEvent(events, event)) {
						continue;
					}
				}

				event.url = calendarUrl;
				event.today = eventStartDateMoment.isSame(now, "d");
				event.dayBeforeYesterday = eventStartDateMoment.isSame(now.clone().subtract(2, "days"), "d");
				event.yesterday = eventStartDateMoment.isSame(now.clone().subtract(1, "days"), "d");
				event.tomorrow = eventStartDateMoment.isSame(now.clone().add(1, "days"), "d");
				event.dayAfterTomorrow = eventStartDateMoment.isSame(now.clone().add(2, "days"), "d");

				/*
				 * if sliceMultiDayEvents is set to true, multiday events (events exceeding at least one midnight) are sliced into days,
				 * otherwise, esp. in dateheaders mode it is not clear how long these events are.
				 */
				const maxCount = eventEndDateMoment.diff(eventStartDateMoment, "days");
				if (this.config.sliceMultiDayEvents && maxCount > 1) {
					const splitEvents = [];
					let midnight
						= eventStartDateMoment
							.clone()
							.startOf("day")
							.add(1, "day")
							.endOf("day");
					let count = 1;
					while (eventEndDateMoment.isAfter(midnight)) {
						const thisEvent = JSON.parse(JSON.stringify(event)); // clone object
						thisEvent.today = this.timestampToMoment(thisEvent.startDate).isSame(now, "d");
						thisEvent.tomorrow = this.timestampToMoment(thisEvent.startDate).isSame(now.clone().add(1, "days"), "d");
						thisEvent.endDate = midnight.clone().subtract(1, "day").format("x");
						thisEvent.title += ` (${count}/${maxCount})`;
						splitEvents.push(thisEvent);

						event.startDate = midnight.format("x");
						count += 1;
						midnight = midnight.clone().add(1, "day").endOf("day"); // next day
					}
					// Last day
					event.title += ` (${count}/${maxCount})`;
					event.today += this.timestampToMoment(event.startDate).isSame(now, "d");
					event.tomorrow = this.timestampToMoment(event.startDate).isSame(now.clone().add(1, "days"), "d");
					splitEvents.push(event);

					for (let splitEvent of splitEvents) {
						if (this.timestampToMoment(splitEvent.endDate).isAfter(now) && this.timestampToMoment(splitEvent.endDate).isSameOrBefore(future)) {
							by_url_calevents.push(splitEvent);
						}
					}
				} else {
					by_url_calevents.push(event);
				}
			}
			if (limitNumberOfEntries) {
				// sort entries before clipping
				by_url_calevents.sort(function (a, b) {
					return a.startDate - b.startDate;
				});
				Log.debug(`[calendar] pushing ${by_url_calevents.length} events to total with room for ${remainingEntries}`);
				events = events.concat(by_url_calevents.slice(0, remainingEntries));
				Log.debug(`[calendar] events for calendar=${events.length}`);
			} else {
				events = events.concat(by_url_calevents);
			}
		}
		Log.info(`[calendar] sorting events count=${events.length}`);
		events.sort(function (a, b) {
			return a.startDate - b.startDate;
		});

		if (!limitNumberOfEntries) {
			return events;
		}

		/*
		 * Limit the number of days displayed
		 * If limitDays is set > 0, limit display to that number of days
		 */
		if (this.config.limitDays > 0 && events.length > 0) { // watch out for initial display before events arrive from helper
			// Group all events by date, events on the same date will be in a list with the key being the date.
			const eventsByDate = Object.groupBy(events, (ev) => this.timestampToMoment(ev.startDate).format("YYYY-MM-DD"));
			const newEvents = [];
			let currentDate = moment();
			let daysCollected = 0;

			while (daysCollected < this.config.limitDays) {
				const dateStr = currentDate.format("YYYY-MM-DD");
				// Check if there are events on the currentDate
				if (eventsByDate[dateStr] && eventsByDate[dateStr].length > 0) {
					// If there are any events today then get all those events and select the currently active events and the events that are starting later in the day.
					newEvents.push(...eventsByDate[dateStr].filter((ev) => this.timestampToMoment(ev.endDate).isAfter(moment())));
					// Since we found a day with events, increase the daysCollected by 1
					daysCollected++;
				}
				// Search for the next day
				currentDate.add(1, "day");
			}
			events = newEvents;
		}
		Log.info(`[calendar] slicing events total maxCount=${this.config.maximumEntries}`);
		return events.slice(0, this.config.maximumEntries);
	},

	listContainsEvent (eventList, event) {
		for (const evt of eventList) {
			if (evt.title === event.title && parseInt(evt.startDate) === parseInt(event.startDate) && parseInt(evt.endDate) === parseInt(event.endDate)) {
				return true;
			}
		}
		return false;
	},

	/**
	 * Requests node helper to add calendar url.
	 * @param {string} url The calendar url to add
	 * @param {object} auth The authentication method and credentials
	 * @param {object} calendarConfig The config of the specific calendar
	 */
	addCalendar (url, auth, calendarConfig) {
		this.sendSocketNotification("ADD_CALENDAR", {
			id: this.identifier,
			url: url,
			excludedEvents: calendarConfig.excludedEvents || this.config.excludedEvents,
			maximumEntries: calendarConfig.maximumEntries || this.config.maximumEntries,
			maximumNumberOfDays: calendarConfig.maximumNumberOfDays || this.config.maximumNumberOfDays,
			pastDaysCount: calendarConfig.pastDaysCount || this.config.pastDaysCount,
			fetchInterval: calendarConfig.fetchInterval || this.config.fetchInterval,
			symbolClass: calendarConfig.symbolClass,
			titleClass: calendarConfig.titleClass,
			timeClass: calendarConfig.timeClass,
			auth: auth,
			broadcastPastEvents: calendarConfig.broadcastPastEvents || this.config.broadcastPastEvents,
			selfSignedCert: calendarConfig.selfSignedCert || this.config.selfSignedCert
		});
	},

	/**
	 * Retrieves the maximum entry count for a specific calendar url.
	 * @param {string} url The calendar url
	 * @returns {number} The maximum entry count
	 */
	maximumEntriesForUrl (url) {
		return this.getCalendarProperty(url, "maximumEntries", this.config.maximumEntries);
	},

	/**
	 * Retrieves the maximum count of past days which events of should be displayed for a specific calendar url.
	 * @param {string} url The calendar url
	 * @returns {number} The maximum past days count
	 */
	maximumPastDaysForUrl (url) {
		return this.getCalendarProperty(url, "pastDaysCount", this.config.pastDaysCount);
	},

	/**
	 * Helper method to retrieve the property for a specific calendar url.
	 * @param {string} url The calendar url
	 * @param {string} property The property to look for
	 * @param {string} defaultValue The value if the property is not found
	 * @returns {string} The property
	 */
	getCalendarProperty (url, property, defaultValue) {
		for (const calendar of this.config.calendars) {
			if (calendar.url === url && calendar.hasOwnProperty(property)) {
				return calendar[property];
			}
		}

		return defaultValue;
	},

	/**
	 * Refresh the DOM every minute if needed: When using relative date format for events that start
	 * or end in less than an hour, the date shows minute granularity and we want to keep that accurate.
	 * --
	 * When updateOnFetch is not set, it will Avoid fade out/in on updateDom when many calendars are used
	 * and it's allow to refresh The DOM every minute with animation speed too
	 * (because updateDom is not set in CALENDAR_EVENTS for this case)
	 */
	selfUpdate () {
		const ONE_MINUTE = 60 * 1000;
		setTimeout(
			() => {
				setInterval(() => {
					Log.debug("[calendar] self update");
					if (this.config.updateOnFetch) {
						this.updateDom(1);
					} else {
						this.updateDom(this.config.animationSpeed);
					}
				}, ONE_MINUTE);
			},
			ONE_MINUTE - (new Date() % ONE_MINUTE)
		);
	}
});
