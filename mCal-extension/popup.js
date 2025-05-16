document.addEventListener('DOMContentLoaded', () => {
  const eventsList = document.getElementById('events-list');

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const today = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const startDate = formatDate(today);
  const endDate = formatDate(sevenDaysFromNow);

  const apiUrl = `http://localhost:8000/events/expanded?start_date=${startDate}&end_date=${endDate}`;

  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(events => {
      if (events.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No upcoming events.';
        eventsList.appendChild(li);
        return;
      }

      events.forEach(event => {
        const li = document.createElement('li');

        const titleSpan = document.createElement('span');
        titleSpan.className = 'event-title';
        titleSpan.textContent = event.title;
        if (event.color) {
          titleSpan.style.color = event.color;
        }
        li.appendChild(titleSpan);

        const timeSpan = document.createElement('span');
        timeSpan.className = 'event-time';
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        
        let timeString = '';
        if (event.is_all_day) {
          timeString = `All day on ${startTime.toLocaleDateString()}`;
        } else {
          timeString = `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${startTime.toLocaleDateString()}`;
        }
        timeSpan.textContent = ` (${timeString})`;
        li.appendChild(timeSpan);

        if (event.description) {
          const descriptionP = document.createElement('p');
          descriptionP.textContent = event.description;
          li.appendChild(descriptionP);
        }
        if (event.location) {
          const locationP = document.createElement('p');
          locationP.textContent = `Location: ${event.location}`;
          li.appendChild(locationP);
        }
        eventsList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Error fetching events:', error);
      const li = document.createElement('li');
      li.textContent = 'Error loading events. Make sure the mCal server is running.';
      li.style.color = 'red';
      eventsList.appendChild(li);
    });
});
