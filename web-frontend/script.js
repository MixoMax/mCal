// --- CONFIG ---
const API_BASE_URL = 'http://localhost:8000'; // Replace with your actual API base URL

// --- STATE ---
let currentView = 'month'; // 'month' or 'week'
let currentDate = new Date(); // Date object for focused date
let miniCalDate = new Date(currentDate); // Date for mini calendar month

let calendars = [];
let events = [];
let selectedCalendarIds = new Set();

// --- DOM Elements ---
const todayBtn = document.getElementById('todayBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentViewInfo = document.getElementById('currentViewInfo');
const viewSelector = document.getElementById('viewSelector');
const timezoneDisplay = document.getElementById('timezoneDisplay');

const newEventBtnSidebar = document.getElementById('newEventBtnSidebar');
const miniCalPrevBtn = document.getElementById('miniCalPrevBtn');
const miniCalNextBtn = document.getElementById('miniCalNextBtn');
const miniCalMonthYear = document.getElementById('miniCalMonthYear');
const miniCalendarGridEl = document.getElementById('miniCalendarGrid');

const addCalendarBtn = document.getElementById('addCalendarBtn');
const calendarListEl = document.getElementById('calendarList');

const monthViewEl = document.getElementById('monthView');
const monthGridEl = document.getElementById('monthGrid');

const weekViewEl = document.getElementById('weekView');
const weekViewDayHeadersEl = document.getElementById('weekViewDayHeaders');
const weekViewAllDayEventsEl = document.getElementById('weekViewAllDayEvents');
const weekViewTimeGutterEl = document.getElementById('weekViewTimeGutter');
const weekViewDaysGridEl = document.getElementById('weekViewDaysGrid');

// Modals & Forms
const eventModal = document.getElementById('eventModal');
const closeEventModalBtn = document.getElementById('closeEventModalBtn');
const eventForm = document.getElementById('eventForm');
const eventModalTitle = document.getElementById('eventModalTitle');
const eventIdInput = document.getElementById('eventId');
const eventTitleInput = document.getElementById('eventTitle');
const eventDescriptionInput = document.getElementById('eventDescription');
const eventLocationInput = document.getElementById('eventLocation'); // New
const eventCalendarSelect = document.getElementById('eventCalendar');
const eventStartTimeInput = document.getElementById('eventStartTime');
const eventEndTimeInput = document.getElementById('eventEndTime');
const eventAllDayCheckbox = document.getElementById('eventAllDay');
const eventRepeatFrequencySelect = document.getElementById('eventRepeatFrequency');
const eventRepeatUntilGroup = document.getElementById('eventRepeatUntilGroup');
const eventRepeatUntilInput = document.getElementById('eventRepeatUntil');
const deleteEventBtn = document.getElementById('deleteEventBtn');

const calendarModal = document.getElementById('calendarModal');
const closeCalendarModalBtn = document.getElementById('closeCalendarModalBtn');
const calendarForm = document.getElementById('calendarForm');
const calendarModalTitle = document.getElementById('calendarModalTitle');
const calendarIdInput = document.getElementById('calendarId');
const calendarNameInput = document.getElementById('calendarName');
const calendarColorInput = document.getElementById('calendarColor');

// AI Modal Elements
const newEventAIBtn = document.getElementById('newEventAIBtn');
const aiInputModal = document.getElementById('aiInputModal');
const closeAiInputModalBtn = document.getElementById('closeAiInputModalBtn');
const aiInputForm = document.getElementById('aiInputForm');
const aiTextInput = document.getElementById('aiText');
const aiImageInput = document.getElementById('aiImage');
const aiImageDropZone = document.getElementById('aiImageDropZone');
const aiImagePreview = document.getElementById('aiImagePreview');

const aiProposalModal = document.getElementById('aiProposalModal');
const closeAiProposalModalBtn = document.getElementById('closeAiProposalModalBtn');
const aiProposalDetailsEl = document.getElementById('aiProposalDetails');
const aiProposalDenyBtn = document.getElementById('aiProposalDenyBtn');
const aiProposalAcceptBtn = document.getElementById('aiProposalAcceptBtn');

let currentAiProposals = []; // Array of all proposals
let currentAiProposalIndex = -1; // Index of current proposal being shown

// --- API Helper ---
async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
    const options = {
        method,
        headers: {}, // Initialize headers
    };
    if (isFormData) {
        // Content-Type is set automatically by browser for FormData
        options.body = body;
    } else {
        options.headers['Content-Type'] = 'application/json';
        if (body) {
            options.body = JSON.stringify(body);
        }
    }
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`API Error (${response.status}): ${errorData.detail || response.statusText}`);
        }
        if (response.status === 204) return null; // No content
        return response.json();
    } catch (error) {
        console.error('API Request Failed:', error);
        alert(`Error: ${error.message}`);
        throw error; // Re-throw to handle in calling function if needed
    }
}

// --- DATE UTILITIES ---
// (Using built-in Date.toISOString().slice(0,10) for YYYY-MM-DD and .slice(0,16) for datetime-local)
function getMonthName(monthIndex) {
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    return monthNames[monthIndex];
}

function getDayName(dayIndex, short = false) { // 0 for Sunday
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return short ? shortDayNames[dayIndex] : dayNames[dayIndex];
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getLastDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function getStartOfWeek(date, firstDayOfWeek = 1) { // 0=Sun, 1=Mon
    const d = new Date(date);
    const day = d.getDay(); // 0-6, Sun-Sat
    const diff = (day < firstDayOfWeek ? day + 7 - firstDayOfWeek : day - firstDayOfWeek);
    d.setDate(d.getDate() - diff);
    d.setHours(0,0,0,0);
    return d;
}

function formatToDateTimeLocal(date) {
    if (!date) return '';
    const d = new Date(date);
    // Offset for timezone to display correctly in datetime-local input
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
}

function formatToDateInput(date) {
    if (!date) return '';
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    return localDate.toISOString().slice(0, 10);
}

function parseDateTimeLocal(str) {
    return new Date(str); // This should work if str is YYYY-MM-DDTHH:MM
}

// --- RENDER FUNCTIONS ---
function render() {
    updateCurrentViewInfo();
    renderMiniCalendar();
    if (currentView === 'month') {
        monthViewEl.classList.remove('hidden');
        weekViewEl.classList.add('hidden');
        renderMonthView();
    } else if (currentView === 'week') {
        monthViewEl.classList.add('hidden');
        weekViewEl.classList.remove('hidden');
        renderWeekView();
    }
    fetchAndRenderEvents(); // This will also re-render events
}

function updateCurrentViewInfo() {
    if (currentView === 'month') {
        currentViewInfo.textContent = `${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`;
    } else { // week
        const start = getStartOfWeek(currentDate, 1); // Assuming Monday start
        const end = addDays(start, 6);
        currentViewInfo.textContent = 
            `${getMonthName(start.getMonth())} ${start.getDate()} - ` +
            (start.getMonth() === end.getMonth() ? '' : `${getMonthName(end.getMonth())} `) +
            `${end.getDate()}, ${end.getFullYear()}`;
    }
    // Update timezone display (simple example)
    const offsetMinutes = new Date().getTimezoneOffset();
    const offsetHours = -offsetMinutes / 60;
    timezoneDisplay.textContent = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
}

function renderMiniCalendar() {
    miniCalMonthYear.textContent = `${getMonthName(miniCalDate.getMonth())} ${miniCalDate.getFullYear()}`;
    miniCalendarGridEl.innerHTML = '';

    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(name => { // Mon-Sun
        const dayNameEl = document.createElement('div');
        dayNameEl.classList.add('mini-calendar-day-name');
        dayNameEl.textContent = name;
        miniCalendarGridEl.appendChild(dayNameEl);
    });
    
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon, 6=Sun
    const daysInMonth = getDaysInMonth(year, month);
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < firstDay; i++) { // Fill leading empty cells
        miniCalendarGridEl.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.classList.add('mini-calendar-day');
        dayEl.textContent = day;
        const thisDay = new Date(year, month, day);
        if (thisDay.getTime() === today.getTime()) {
            dayEl.classList.add('today');
        }
        if (thisDay.getFullYear() === currentDate.getFullYear() &&
            thisDay.getMonth() === currentDate.getMonth() &&
            thisDay.getDate() === currentDate.getDate()) {
            dayEl.classList.add('selected');
        }
        dayEl.addEventListener('click', () => {
            currentDate = new Date(year, month, day);
            miniCalDate = new Date(currentDate); // Sync miniCalDate with selection
            render();
        });
        miniCalendarGridEl.appendChild(dayEl);
    }
}

function renderMonthView() {
    monthGridEl.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonthDate = new Date(year, month, 1);
    let startDate = getStartOfWeek(firstDayOfMonthDate, 1); // Monday start

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < 42; i++) { // 6 weeks display
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);

        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell');
        dayCell.dataset.date = cellDate.toISOString().slice(0,10);

        if (cellDate.getMonth() !== month) {
            dayCell.classList.add('other-month');
        }
        if (cellDate.getTime() === today.getTime()) {
            dayCell.classList.add('today');
        }

        const dayNumber = document.createElement('div');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = cellDate.getDate();
        dayCell.appendChild(dayNumber);

        const eventsContainer = document.createElement('div');
        eventsContainer.classList.add('month-events-container');
        dayCell.appendChild(eventsContainer);
        
        monthGridEl.appendChild(dayCell);
    }
    renderEventsInMonthView();
}

function renderWeekView() {
    weekViewDayHeadersEl.innerHTML = '';
    weekViewAllDayEventsEl.innerHTML = '';
    weekViewTimeGutterEl.innerHTML = '';
    weekViewDaysGridEl.innerHTML = '';

    const startOfWeek = getStartOfWeek(currentDate, 1); // Monday start
    const today = new Date();
    today.setHours(0,0,0,0);

    // Time Gutter (00:00 - 23:00)
    for (let hour = 0; hour < 24; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.classList.add('week-view-time-slot');
        timeSlot.textContent = `${String(hour).padStart(2, '0')}:00`;
        weekViewTimeGutterEl.appendChild(timeSlot);
    }

    // Day Headers & Columns
    for (let i = 0; i < 7; i++) {
        const day = addDays(startOfWeek, i);
        
        // Header
        const dayHeader = document.createElement('div');
        dayHeader.classList.add('week-view-day-header');
        if (day.getTime() === today.getTime()) {
            dayHeader.classList.add('today');
        }
        dayHeader.innerHTML = `
            <div class="day-name">${getDayName(day.getDay(), true)}</div>
            <div class="day-date">${day.getDate()}</div>
        `;
        weekViewDayHeadersEl.appendChild(dayHeader);

        // All-day event column
        const allDayCol = document.createElement('div');
        allDayCol.classList.add('week-view-all-day-column');
        allDayCol.dataset.date = day.toISOString().slice(0,10);
        weekViewAllDayEventsEl.appendChild(allDayCol);

        // Main day column
        const dayColumn = document.createElement('div');
        dayColumn.classList.add('week-view-day-column');
        dayColumn.dataset.date = day.toISOString().slice(0,10);
        for (let hour = 0; hour < 24; hour++) { // Add hour lines for structure
            const hourLine = document.createElement('div');
            hourLine.classList.add('hour-line');
            dayColumn.appendChild(hourLine);
        }
        weekViewDaysGridEl.appendChild(dayColumn);
    }
    renderEventsInWeekView();
}

async function fetchAndRenderEvents() {
    let viewStartDate, viewEndDate;

    if (currentView === 'month') {
        const firstCellDate = getStartOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), 1);
        viewStartDate = new Date(firstCellDate);
        viewEndDate = addDays(viewStartDate, 41); // 6 weeks
    } else { // week
        viewStartDate = getStartOfWeek(currentDate, 1);
        viewEndDate = addDays(viewStartDate, 6);
    }
    
    try {
        const startStr = viewStartDate.toISOString().slice(0,10);
        const endStr = viewEndDate.toISOString().slice(0,10);
        // Fetch all events in range initially, then filter by selected calendars client-side
        const allFetchedEvents = await apiRequest(`/events/expanded?start_date=${startStr}&end_date=${endStr}`);
        
        events = allFetchedEvents.filter(event => 
            selectedCalendarIds.size === 0 || selectedCalendarIds.has(String(event.calendar_id))
        );

        if (currentView === 'month') {
            renderEventsInMonthView();
        } else {
            renderEventsInWeekView();
        }
    } catch (error) {
        console.error("Failed to fetch or render events:", error);
        // Clear existing events from view on error or show message
        if (currentView === 'month') monthGridEl.querySelectorAll('.month-events-container').forEach(c => c.innerHTML = '');
        else {
            weekViewAllDayEventsEl.querySelectorAll('.week-view-all-day-column').forEach(c => c.innerHTML = '');
            weekViewDaysGridEl.querySelectorAll('.week-view-day-column').forEach(c => c.innerHTML = ''); // Clear timed events
        }
    }
}

function renderEventsInMonthView() {
    // Clear previous events
    monthGridEl.querySelectorAll('.month-events-container').forEach(c => c.innerHTML = '');

    events.forEach(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);

        // Iterate through each day the event spans within the current view
        let currentIterDate = new Date(Math.max(eventStart, new Date(monthGridEl.firstChild.dataset.date + "T00:00:00")));
        const viewEndDate = new Date(monthGridEl.lastChild.dataset.date + "T23:59:59");
        
        while(currentIterDate <= eventEnd && currentIterDate <= viewEndDate) {
            const dateStr = currentIterDate.toISOString().slice(0,10);
            const dayCellContainer = monthGridEl.querySelector(`.day-cell[data-date="${dateStr}"] .month-events-container`);
            
            if (dayCellContainer) {
                const eventEl = document.createElement('div');
                eventEl.classList.add('month-event');
                if (event.is_all_day) eventEl.classList.add('all-day');
                
                let displayTitle = event.title;
                if (!event.is_all_day) {
                        // Only show time if event starts on this day, or it's the first day of a multi-day event in view
                    if (currentIterDate.toDateString() === eventStart.toDateString() || 
                        (currentIterDate.toDateString() === new Date(monthGridEl.firstChild.dataset.date + "T00:00:00").toDateString() && eventStart < currentIterDate)) {
                        displayTitle = `${String(eventStart.getHours()).padStart(2, '0')}:${String(eventStart.getMinutes()).padStart(2, '0')} ${event.title}`;
                    }
                }
                eventEl.textContent = displayTitle;
                eventEl.style.backgroundColor = event.color || getComputedStyle(document.documentElement).getPropertyValue('--event-default-color').trim();
                if (isColorDark(event.color || getComputedStyle(document.documentElement).getPropertyValue('--event-default-color').trim())) {
                    eventEl.style.color = 'var(--text-primary)';
                } else {
                    eventEl.style.color = 'var(--bg-primary)';
                }

                eventEl.addEventListener('click', () => openEventModal(event.original_event_id));
                dayCellContainer.appendChild(eventEl);
            }
            currentIterDate = addDays(currentIterDate, 1);
            currentIterDate.setHours(0,0,0,0); // Ensure we iterate by full days
        }
    });
}

function renderEventsInWeekView() {
    // Clear previous events
    weekViewAllDayEventsEl.querySelectorAll('.week-view-all-day-column').forEach(c => c.innerHTML = '');
    weekViewDaysGridEl.querySelectorAll('.week-view-day-column').forEach(dCol => {
        // Remove only event elements, not hour lines
        Array.from(dCol.getElementsByClassName('week-event')).forEach(ev => ev.remove());
    });

    const hourSlotHeight = 50; // pixels, must match CSS

    events.forEach(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        const dateStr = eventStart.toISOString().slice(0,10);

        if (event.is_all_day) {
            const allDayCol = weekViewAllDayEventsEl.querySelector(`.week-view-all-day-column[data-date="${dateStr}"]`);
            if (allDayCol) {
                const eventEl = document.createElement('div');
                eventEl.classList.add('week-event', 'all-day');
                eventEl.textContent = event.title;
                eventEl.style.backgroundColor = event.color || getComputedStyle(document.documentElement).getPropertyValue('--event-default-color').trim();
                if (isColorDark(event.color || getComputedStyle(document.documentElement).getPropertyValue('--event-default-color').trim())) {
                    eventEl.style.color = 'var(--text-primary)';
                } else {
                    eventEl.style.color = 'var(--bg-primary)';
                }
                eventEl.addEventListener('click', () => openEventModal(event.original_event_id));
                allDayCol.appendChild(eventEl);
            }
        } else {
            const dayColumn = weekViewDaysGridEl.querySelector(`.week-view-day-column[data-date="${dateStr}"]`);
            if (dayColumn) {
                const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
                const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;
                // Handle events that span midnight, though API might split them.
                // For simplicity, we assume endHour is > startHour for events on a single day.
                const durationHours = Math.max(0.25, endHour - startHour); // Min 15 min height

                const eventEl = document.createElement('div');
                eventEl.classList.add('week-event');
                eventEl.style.top = `${startHour * hourSlotHeight}px`;
                eventEl.style.height = `${durationHours * hourSlotHeight}px`;
                eventEl.style.backgroundColor = event.color || getComputedStyle(document.documentElement).getPropertyValue('--event-default-color').trim();
                    if (isColorDark(event.color || getComputedStyle(document.documentElement).getPropertyValue('--event-default-color').trim())) {
                    eventEl.style.color = 'var(--text-primary)';
                } else {
                    eventEl.style.color = 'var(--bg-primary)';
                }

                eventEl.innerHTML = `
                    <span class="event-time">${String(eventStart.getHours()).padStart(2, '0')}:${String(eventStart.getMinutes()).padStart(2, '0')}</span>
                    <span class="event-title">${event.title}</span>
                `;
                eventEl.addEventListener('click', () => openEventModal(event.original_event_id));
                dayColumn.appendChild(eventEl);
            }
        }
    });
}

// --- Calendar Management ---
async function loadCalendars() {
    try {
        calendars = await apiRequest('/calendars');
        if (calendars.length > 0 && selectedCalendarIds.size === 0) {
            // By default, select the first calendar if none are selected
            // Or, a calendar named "My calendar" or "Personal"
            let defaultCalendar = calendars.find(c => c.name.toLowerCase() === "my calendar" || c.name.toLowerCase() === "personal");
            if (!defaultCalendar) defaultCalendar = calendars[0];
            selectedCalendarIds.add(String(defaultCalendar.id));
        }
        renderCalendarList();
        populateCalendarDropdown();
    } catch (error) {
        console.error("Failed to load calendars:", error);
    }
}

function renderCalendarList() {
    calendarListEl.innerHTML = '';
    calendars.forEach(cal => {
        const li = document.createElement('li');
        li.classList.add('calendar-list-item');
        li.innerHTML = `
            <input type="checkbox" data-id="${cal.id}" ${selectedCalendarIds.has(String(cal.id)) ? 'checked' : ''}>
            <span class="calendar-color-indicator" style="background-color: ${cal.color || '#888888'};"></span>
            <span style="flex-grow:1;">${cal.name}</span>
            <span class="calendar-actions">
                <button data-id="${cal.id}" class="edit-cal-btn">Edit</button>
                <button data-id="${cal.id}" class="delete-cal-btn">Del</button>
            </span>
        `;
        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedCalendarIds.add(e.target.dataset.id);
            } else {
                selectedCalendarIds.delete(e.target.dataset.id);
            }
            fetchAndRenderEvents(); // Re-filter events
        });

        li.querySelector('.edit-cal-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent checkbox toggle if name is clicked
            openCalendarModal(cal.id);
        });
        li.querySelector('.delete-cal-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete calendar "${cal.name}" and all its events?`)) {
                try {
                    await apiRequest(`/calendars/${cal.id}`, 'DELETE');
                    loadCalendars(); // Refresh list
                    fetchAndRenderEvents(); // Refresh events
                } catch (error) { /* Handled by apiRequest */ }
            }
        });
        calendarListEl.appendChild(li);
    });
}

function populateCalendarDropdown() {
    eventCalendarSelect.innerHTML = '';
    calendars.forEach(cal => {
        const option = document.createElement('option');
        option.value = cal.id;
        option.textContent = cal.name;
        eventCalendarSelect.appendChild(option);
    });
}

function isColorDark(hexColor) {
    if (!hexColor) return true; // Default to dark if no color
    const color = (hexColor.charAt(0) === '#') ? hexColor.substring(1, 7) : hexColor;
    const r = parseInt(color.substring(0, 2), 16); // hexToR
    const g = parseInt(color.substring(2, 4), 16); // hexToG
    const b = parseInt(color.substring(4, 6), 16); // hexToB
    // HSP (Highly Sensitive Poo) equation
    const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    return hsp < 127.5; // Below 127.5 is considered dark
}


// --- Modal Handling ---
function openEventModal(eventIdToEdit = null) {
    eventForm.reset();
    deleteEventBtn.classList.add('hidden');
    eventRepeatUntilGroup.classList.add('hidden');
    eventIdInput.value = '';

    if (calendars.length === 0) {
        alert("Please create a calendar first.");
        return;
    }
    populateCalendarDropdown(); // Ensure it's up-to-date

    if (eventIdToEdit) {
        eventModalTitle.textContent = 'Edit Event';
        deleteEventBtn.classList.remove('hidden');
        // Fetch full event details for editing (as EventOccurence might be partial)
        apiRequest(`/events/${eventIdToEdit}`)
            .then(eventData => {
                eventIdInput.value = eventData.id;
                eventTitleInput.value = eventData.title;
                eventDescriptionInput.value = eventData.description || '';
                eventLocationInput.value = eventData.location || ''; // New
                eventCalendarSelect.value = eventData.calendar_id;
                eventStartTimeInput.value = formatToDateTimeLocal(eventData.start_time);
                eventEndTimeInput.value = formatToDateTimeLocal(eventData.end_time);
                eventAllDayCheckbox.checked = eventData.is_all_day;
                eventRepeatFrequencySelect.value = eventData.repeat_frequency;
                if (eventData.repeat_frequency !== 'none') {
                    eventRepeatUntilGroup.classList.remove('hidden');
                    eventRepeatUntilInput.value = eventData.repeat_until ? formatToDateInput(eventData.repeat_until) : '';
                }
            })
            .catch(err => {
                console.error("Error fetching event for edit:", err);
                closeModal(eventModal);
            });
    } else {
        eventModalTitle.textContent = 'Create Event';
        // Pre-fill start time sensible default if possible (e.g. selected day, next hour)
        const defaultStart = new Date(currentDate);
        defaultStart.setHours(defaultStart.getHours() + 1, 0, 0, 0); // Next hour
        const defaultEnd = new Date(defaultStart);
        defaultEnd.setHours(defaultStart.getHours() + 1); // 1 hour duration
        eventStartTimeInput.value = formatToDateTimeLocal(defaultStart);
        eventEndTimeInput.value = formatToDateTimeLocal(defaultEnd);

        // Pre-select the first visible calendar, or first overall
        if (selectedCalendarIds.size > 0) {
            eventCalendarSelect.value = selectedCalendarIds.values().next().value;
        } else if (calendars.length > 0) {
            eventCalendarSelect.value = calendars[0].id;
        }
    }
    eventModal.style.display = 'flex';
}

function openCalendarModal(calendarIdToEdit = null) {
    calendarForm.reset();
    calendarIdInput.value = '';
    if (calendarIdToEdit) {
        calendarModalTitle.textContent = 'Edit Calendar';
        const cal = calendars.find(c => c.id === calendarIdToEdit);
        if (cal) {
            calendarIdInput.value = cal.id;
            calendarNameInput.value = cal.name;
            calendarColorInput.value = cal.color || '#4A90E2';
        }
    } else {
        calendarModalTitle.textContent = 'Create Calendar';
        calendarColorInput.value = '#4A90E2'; // Default new calendar color
    }
    calendarModal.style.display = 'flex';
}

function closeModal(modalElement) {
    modalElement.style.display = 'none';
    if (modalElement === aiInputModal) { // Reset AI form on close
        aiInputForm.reset();
        aiImagePreview.style.display = 'none';
        aiImagePreview.src = '#';
        aiImageInput.value = ''; // Clear file input
    }
    if (modalElement === aiProposalModal) {
        currentAiProposals = [];
        currentAiProposalIndex = -1;
        aiProposalDetailsEl.textContent = '';
    }
}

// --- AI MODAL FUNCTIONS ---
function openAiInputModal() {
    aiInputForm.reset();
    aiImagePreview.style.display = 'none';
    aiImagePreview.src = '#';
    aiImageInput.value = '';
    aiInputModal.style.display = 'flex';
}

function showCurrentProposal() {
    if (currentAiProposalIndex >= 0 && currentAiProposalIndex < currentAiProposals.length) {
        const proposal = currentAiProposals[currentAiProposalIndex];
        aiProposalDetailsEl.textContent = JSON.stringify(proposal, null, 2);
        
        // Update modal title to show progress if multiple proposals
        const modalTitle = document.getElementById('aiProposalTitle');
        if (currentAiProposals.length > 1) {
            modalTitle.textContent = `AI Event Proposal (${currentAiProposalIndex + 1}/${currentAiProposals.length})`;
        } else {
            modalTitle.textContent = 'AI Event Proposal';
        }

        // Update description text based on number of proposals
        const descText = aiProposalModal.querySelector('p');
        if (currentAiProposals.length > 1) {
            descText.textContent = `The AI suggests the following events. You can review them one at a time. (${currentAiProposalIndex + 1} of ${currentAiProposals.length})`;
        } else {
            descText.textContent = 'The AI suggests the following event. You can edit it before saving.';
        }
    }
}

function openAiProposalModal(proposals) {
    // Convert single proposal to array for consistent handling
    currentAiProposals = Array.isArray(proposals) ? proposals : [proposals];
    currentAiProposalIndex = 0;
    
    // If there are multiple proposals, update the header text
    const modalTitle = aiProposalModal.querySelector('.modal-header h2');
    if (currentAiProposals.length > 1) {
        modalTitle.textContent = `AI Event Proposal (1/${currentAiProposals.length})`;
    } else {
        modalTitle.textContent = 'AI Event Proposal';
    }
    
    showCurrentProposal();
    aiProposalModal.style.display = 'flex';
}

function handleAiImageFile(file) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            aiImagePreview.src = e.target.result;
            aiImagePreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
        // Set the file to the input for form submission
        // Create a new FileList and assign it
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        aiImageInput.files = dataTransfer.files;
    } else {
        alert("Please select a valid image file (PNG, JPG, GIF).");
        aiImageInput.value = ''; // Clear invalid file
        aiImagePreview.style.display = 'none';
        aiImagePreview.src = '#';
    }
}


// --- EVENT LISTENERS ---
newEventAIBtn.addEventListener('click', openAiInputModal);
closeAiInputModalBtn.addEventListener('click', () => closeModal(aiInputModal));
closeAiProposalModalBtn.addEventListener('click', () => closeModal(aiProposalModal));

aiImageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        handleAiImageFile(e.target.files[0]);
    }
});

aiImageDropZone.addEventListener('click', () => aiImageInput.click());
aiImageDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    aiImageDropZone.style.borderColor = 'var(--accent-primary)';
});
aiImageDropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    aiImageDropZone.style.borderColor = 'var(--border-color)';
});
aiImageDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    aiImageDropZone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleAiImageFile(e.dataTransfer.files[0]);
    }
});
document.addEventListener('paste', (e) => {
    if (aiInputModal.style.display === 'flex') { // Only if AI modal is open
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf('image') === 0) {
                const blob = item.getAsFile();
                handleAiImageFile(blob);
                e.preventDefault(); // Prevent pasting image elsewhere
                break;
            }
        }
    }
});

aiInputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = aiTextInput.value;
    const imageFile = aiImageInput.files[0];

    if (!text && !imageFile) {
        alert("Please provide either text or an image for the AI.");
        return;
    }

    let payload = { text };
    
    if (imageFile) {
        const reader = new FileReader();
        const imagePromise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });
        
        try {
            const dataUrl = await imagePromise;
            // Extract base64 part after the comma
            payload.image_b64 = dataUrl.split(',')[1];
        } catch (error) {
            console.error('Error reading image file:', error);
            alert('Failed to process image file');
            return;
        }
    }


    try {
        // Show some loading indicator if desired
        aiInputForm.querySelector('button[type="submit"]').textContent = 'Processing...';
        aiInputForm.querySelector('button[type="submit"]').disabled = true;

        const proposal = await apiRequest('/events/ai-suggest', 'POST', payload);
        
        closeModal(aiInputModal);
        openAiProposalModal(proposal);
    } catch (error) {
        // Error already alerted by apiRequest
        console.error("AI suggestion failed:", error);
    } finally {
            aiInputForm.querySelector('button[type="submit"]').textContent = 'Get AI Suggestion';
            aiInputForm.querySelector('button[type="submit"]').disabled = false;
    }
});

// Function to move to next proposal or close if done
function moveToNextProposal() {
    currentAiProposalIndex++;
    if (currentAiProposalIndex >= currentAiProposals.length) {
        closeModal(aiProposalModal);
        fetchAndRenderEvents();
    } else {
        showCurrentProposal();
    }
}

aiProposalAcceptBtn.addEventListener('click', async () => {
    if (currentAiProposalIndex < 0 || currentAiProposalIndex >= currentAiProposals.length) return;

    const proposal = currentAiProposals[currentAiProposalIndex];
    
    // Find appropriate calendar ID
    let calendarId;
    if (proposal.calendar_name) {
        const foundCalendar = calendars.find(c => c.name.toLowerCase() === proposal.calendar_name.toLowerCase());
        calendarId = foundCalendar ? foundCalendar.id : calendars[0]?.id;
    } else {
        calendarId = calendars[0]?.id;
    }

    if (!calendarId) {
        alert("No calendar available. Please create a calendar first.");
        closeModal(aiProposalModal);
        return;
    }

    // Create single event for current proposal
    const eventData = {
        title: proposal.title,
        description: proposal.description || null,
        location: proposal.location || null,
        start_time: proposal.start_time || new Date(currentDate).toISOString(),
        end_time: proposal.end_time || new Date(new Date(proposal.start_time || currentDate).getTime() + 3600000).toISOString(),
        is_all_day: proposal.is_all_day || false,
        repeat_frequency: proposal.repeat_frequency || 'none',
        repeat_until: proposal.repeat_until || null
    };

    try {
        await apiRequest(`/calendars/${calendarId}/events`, 'POST', eventData);
        moveToNextProposal();
    } catch (error) {
        console.error('Failed to create event:', error);
        alert('Failed to create event. Moving to next proposal.');
        moveToNextProposal();
    }
});

aiProposalDenyBtn.addEventListener('click', () => {
    moveToNextProposal(); // Skip current proposal
});


todayBtn.addEventListener('click', () => {
    currentDate = new Date();
    miniCalDate = new Date(currentDate);
    render();
});

prevBtn.addEventListener('click', () => {
    if (currentView === 'month') {
        currentDate = addMonths(currentDate, -1);
    } else {
        currentDate = addDays(currentDate, -7);
    }
    miniCalDate = new Date(currentDate); // Sync mini calendar display
    render();
});

nextBtn.addEventListener('click', () => {
    if (currentView === 'month') {
        currentDate = addMonths(currentDate, 1);
    } else {
        currentDate = addDays(currentDate, 7);
    }
    miniCalDate = new Date(currentDate); // Sync mini calendar display
    render();
});

viewSelector.addEventListener('change', (e) => {
    currentView = e.target.value;
    render();
});

newEventBtnSidebar.addEventListener('click', () => openEventModal());

miniCalPrevBtn.addEventListener('click', () => {
    miniCalDate = addMonths(miniCalDate, -1);
    renderMiniCalendar();
});
miniCalNextBtn.addEventListener('click', () => {
    miniCalDate = addMonths(miniCalDate, 1);
    renderMiniCalendar();
});

addCalendarBtn.addEventListener('click', () => openCalendarModal());

// Modal Close Buttons
closeEventModalBtn.addEventListener('click', () => closeModal(eventModal));
closeCalendarModalBtn.addEventListener('click', () => closeModal(calendarModal));
window.addEventListener('click', (event) => { // Close on outside click
    if (event.target === eventModal) closeModal(eventModal);
    if (event.target === calendarModal) closeModal(calendarModal);
});

// Event Form Logic
eventRepeatFrequencySelect.addEventListener('change', (e) => {
    if (e.target.value === 'none') {
        eventRepeatUntilGroup.classList.add('hidden');
        eventRepeatUntilInput.value = '';
    } else {
        eventRepeatUntilGroup.classList.remove('hidden');
    }
});

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = eventIdInput.value;
    const calendarId = eventCalendarSelect.value;
    const eventData = {
        title: eventTitleInput.value,
        description: eventDescriptionInput.value || null,
        location: eventLocationInput.value || null, // New
        start_time: parseDateTimeLocal(eventStartTimeInput.value).toISOString(),
        end_time: parseDateTimeLocal(eventEndTimeInput.value).toISOString(),
        is_all_day: eventAllDayCheckbox.checked,
        repeat_frequency: eventRepeatFrequencySelect.value,
        repeat_until: eventRepeatFrequencySelect.value !== 'none' && eventRepeatUntilInput.value 
                        ? new Date(eventRepeatUntilInput.value).toISOString().slice(0,10) 
                        : null,
    };
    
    // Basic validation
    if (new Date(eventData.end_time) < new Date(eventData.start_time)) {
        alert("End time cannot be before start time.");
        return;
    }

    try {
        if (id) { // Update
            await apiRequest(`/events/${id}`, 'PUT', eventData);
        } else { // Create
            await apiRequest(`/calendars/${calendarId}/events`, 'POST', eventData);
        }
        closeModal(eventModal);
        fetchAndRenderEvents(); // Refresh view
    } catch (error) { /* Handled by apiRequest */ }
});

deleteEventBtn.addEventListener('click', async () => {
    const id = eventIdInput.value;
    if (id && confirm("Are you sure you want to delete this event?")) {
        try {
            await apiRequest(`/events/${id}`, 'DELETE');
            closeModal(eventModal);
            fetchAndRenderEvents();
        } catch (error) { /* Handled by apiRequest */ }
    }
});

// Calendar Form Logic
calendarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = calendarIdInput.value;
    const calendarData = {
        name: calendarNameInput.value,
        color: calendarColorInput.value
    };
    try {
        if (id) { // Update
            await apiRequest(`/calendars/${id}`, 'PUT', calendarData);
        } else { // Create
            await apiRequest(`/calendars`, 'POST', calendarData);
        }
        closeModal(calendarModal);
        loadCalendars(); // Refresh list and dropdown
        fetchAndRenderEvents(); // In case color changed or new calendar added
    } catch (error) { /* Handled by apiRequest */ }
});

// --- INITIALIZATION ---
async function initializeApp() {
    viewSelector.value = currentView;
    await loadCalendars(); // Load calendars first to populate dropdowns and selection
    render(); // Initial render of current view and events
}

initializeApp();