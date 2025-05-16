Okay, here's the API documentation for the Simple Calendar Backend in Markdown format.

# mCal server API Documentation

This document provides details on the API endpoints for the Simple Calendar backend. All datetime strings are expected in ISO 8601 format (e.g., `YYYY-MM-DDTHH:MM:SS` for datetimes, `YYYY-MM-DD` for dates). All times are local.

## Data Models

### Calendar
Represents a calendar to group events.
```json
{
  "id": 1,
  "name": "Work Calendar",
  "color": "#FF5733" // Optional
}
```

### CalendarCreate
Used for creating or updating a calendar.
```json
{
  "name": "Personal Calendar",
  "color": "#33CFFF" // Optional
}
```

### Event
Represents a single event or the base of a repeating event.
```json
{
  "id": 101,
  "calendar_id": 1,
  "title": "Team Meeting",
  "description": "Weekly team sync", // Optional
  "start_time": "2023-11-15T10:00:00",
  "end_time": "2023-11-15T11:00:00",
  "is_all_day": false,
  "repeat_frequency": "weekly", // "none", "daily", "weekly", "monthly", "yearly"
  "repeat_until": "2024-06-30" // Optional, YYYY-MM-DD
}
```

### EventCreate
Used for creating or updating an event.
```json
{
  "title": "Project Deadline",
  "description": "Finalize project report", // Optional
  "start_time": "2023-12-01T09:00:00",
  "end_time": "2023-12-01T17:00:00",
  "is_all_day": false,
  "repeat_frequency": "none",
  "repeat_until": null // Optional, YYYY-MM-DD
}
```
**Note on `start_time` and `end_time` for `EventCreate`:** If `is_all_day` is `true`, the time components of `start_time` and `end_time` will be adjusted internally. `start_time` will be set to the beginning of the day (00:00:00) and `end_time` to the end of the day (23:59:59.999999).

### EventOccurrence
Represents an actual occurrence of an event, especially for expanded views of repeating events.
```json
{
  "original_event_id": 101,
  "calendar_id": 1,
  "title": "Team Meeting",
  "description": "Weekly team sync",
  "start_time": "2023-11-22T10:00:00", // This specific occurrence's start
  "end_time": "2023-11-22T11:00:00",   // This specific occurrence's end
  "is_all_day": false,
  "color": "#FF5733" // Color from the parent calendar
}
```

---

## Calendar Endpoints

### 1. Create Calendar

*   **Route:** `POST /calendars/`
*   **Description:** Creates a new calendar.
*   **Request Body:** `CalendarCreate`
    ```json
    {
      "name": "Holidays",
      "color": "green"
    }
    ```
*   **Parameters:** None.
*   **Server-Side State Change:** A new row is inserted into the `calendars` table in the database.
*   **Responses:**
    *   **`201 Created`**: Calendar created successfully.
        *   **Body:** `Calendar` (the newly created calendar with its ID)
        ```json
        {
          "id": 2,
          "name": "Holidays",
          "color": "green"
        }
        ```
    *   **`400 Bad Request`**: If a calendar with the same name already exists.
        ```json
        {
          "detail": "Calendar with name 'Holidays' already exists."
        }
        ```
    *   **`422 Unprocessable Entity`**: If the request body is invalid (e.g., missing `name`).

### 2. Get All Calendars

*   **Route:** `GET /calendars/`
*   **Description:** Retrieves a list of all calendars.
*   **Request Body:** None.
*   **Parameters:** None.
*   **Server-Side State Change:** None.
*   **Responses:**
    *   **`200 OK`**: Successfully retrieved calendars.
        *   **Body:** `List[Calendar]`
        ```json
        [
          {
            "id": 1,
            "name": "Work Calendar",
            "color": "#FF5733"
          },
          {
            "id": 2,
            "name": "Holidays",
            "color": "green"
          }
        ]
        ```

### 3. Get Calendar by ID

*   **Route:** `GET /calendars/{calendar_id}/`
*   **Description:** Retrieves a specific calendar by its ID.
*   **Request Body:** None.
*   **Parameters:**
    *   `calendar_id` (Path, integer, required): The ID of the calendar to retrieve. Must be greater than 0.
*   **Server-Side State Change:** None.
*   **Responses:**
    *   **`200 OK`**: Successfully retrieved the calendar.
        *   **Body:** `Calendar`
        ```json
        {
          "id": 1,
          "name": "Work Calendar",
          "color": "#FF5733"
        }
        ```
    *   **`404 Not Found`**: If the calendar with the given ID does not exist.
        ```json
        {
          "detail": "Calendar not found"
        }
        ```
    *   **`422 Unprocessable Entity`**: If `calendar_id` is not a valid integer or not > 0.

### 4. Update Calendar

*   **Route:** `PUT /calendars/{calendar_id}/`
*   **Description:** Updates an existing calendar.
*   **Request Body:** `CalendarCreate`
    ```json
    {
      "name": "Updated Work Calendar",
      "color": "#FFA500"
    }
    ```
*   **Parameters:**
    *   `calendar_id` (Path, integer, required): The ID of the calendar to update.
*   **Server-Side State Change:** The corresponding row in the `calendars` table is updated.
*   **Responses:**
    *   **`200 OK`**: Calendar updated successfully.
        *   **Body:** `Calendar` (the updated calendar data)
        ```json
        {
          "id": 1,
          "name": "Updated Work Calendar",
          "color": "#FFA500"
        }
        ```
    *   **`400 Bad Request`**: If attempting to update the name to one that already exists for another calendar.
        ```json
        {
          "detail": "Calendar with name 'Some Other Existing Name' already exists."
        }
        ```
    *   **`404 Not Found`**: If the calendar with the given ID does not exist.
        ```json
        {
          "detail": "Calendar not found"
        }
        ```
    *   **`422 Unprocessable Entity`**: If the request body or path parameter is invalid.

### 5. Delete Calendar

*   **Route:** `DELETE /calendars/{calendar_id}/`
*   **Description:** Deletes a calendar and all its associated events (due to `ON DELETE CASCADE`).
*   **Request Body:** None.
*   **Parameters:**
    *   `calendar_id` (Path, integer, required): The ID of the calendar to delete. Must be greater than 0.
*   **Server-Side State Change:** The row for the specified calendar is deleted from the `calendars` table. All associated events in the `events` table are also deleted.
*   **Responses:**
    *   **`204 No Content`**: Calendar (and its events) deleted successfully.
    *   **`404 Not Found`**: If the calendar with the given ID does not exist.
        ```json
        {
          "detail": "Calendar not found"
        }
        ```
    *   **`422 Unprocessable Entity`**: If `calendar_id` is not a valid integer or not > 0.

---

## Event Endpoints

### 1. Create Event

*   **Route:** `POST /calendars/{calendar_id}/events/`
*   **Description:** Creates a new event within a specified calendar.
*   **Request Body:** `EventCreate`
    ```json
    {
      "title": "Doctor Appointment",
      "description": "Annual check-up",
      "start_time": "2023-11-20T14:00:00",
      "end_time": "2023-11-20T15:00:00",
      "is_all_day": false,
      "repeat_frequency": "none",
      "repeat_until": null
    }
    ```
*   **Parameters:**
    *   `calendar_id` (Path, integer, required): The ID of the calendar to which this event belongs.
*   **Server-Side State Change:** A new row is inserted into the `events` table, linked to the specified `calendar_id`.
*   **Responses:**
    *   **`201 Created`**: Event created successfully.
        *   **Body:** `Event` (the newly created event with its ID and `calendar_id`)
        ```json
        {
          "id": 102,
          "calendar_id": 1,
          "title": "Doctor Appointment",
          "description": "Annual check-up",
          "start_time": "2023-11-20T14:00:00",
          "end_time": "2023-11-20T15:00:00",
          "is_all_day": false,
          "repeat_frequency": "none",
          "repeat_until": null
        }
        ```
    *   **`404 Not Found`**: If the specified `calendar_id` does not exist.
        ```json
        {
          "detail": "Calendar not found"
        }
        ```
    *   **`422 Unprocessable Entity`**: If the request body is invalid (e.g., `end_time` before `start_time`, invalid `repeat_frequency`, invalid datetime format).

### 2. Get Event by ID

*   **Route:** `GET /events/{event_id}/`
*   **Description:** Retrieves a specific event by its ID.
*   **Request Body:** None.
*   **Parameters:**
    *   `event_id` (Path, integer, required): The ID of the event to retrieve. Must be greater than 0.
*   **Server-Side State Change:** None.
*   **Responses:**
    *   **`200 OK`**: Successfully retrieved the event.
        *   **Body:** `Event`
        ```json
        {
          "id": 101,
          "calendar_id": 1,
          "title": "Team Meeting",
          "description": "Weekly team sync",
          "start_time": "2023-11-15T10:00:00",
          "end_time": "2023-11-15T11:00:00",
          "is_all_day": false,
          "repeat_frequency": "weekly",
          "repeat_until": "2024-06-30"
        }
        ```
    *   **`404 Not Found`**: If the event with the given ID does not exist.
        ```json
        {
          "detail": "Event not found"
        }
        ```
    *   **`422 Unprocessable Entity`**: If `event_id` is not a valid integer or not > 0.

### 3. Update Event

*   **Route:** `PUT /events/{event_id}/`
*   **Description:** Updates an existing event. Note: The `calendar_id` of an event cannot be changed via this endpoint.
*   **Request Body:** `EventCreate`
    ```json
    {
      "title": "Team Meeting (Rescheduled)",
      "description": "Weekly team sync - new time",
      "start_time": "2023-11-15T11:00:00",
      "end_time": "2023-11-15T12:00:00",
      "is_all_day": false,
      "repeat_frequency": "weekly",
      "repeat_until": "2024-07-31"
    }
    ```
*   **Parameters:**
    *   `event_id` (Path, integer, required): The ID of the event to update.
*   **Server-Side State Change:** The corresponding row in the `events` table is updated.
*   **Responses:**
    *   **`200 OK`**: Event updated successfully.
        *   **Body:** `Event` (the updated event data, `calendar_id` remains the original)
        ```json
        {
          "id": 101,
          "calendar_id": 1, // Original calendar_id
          "title": "Team Meeting (Rescheduled)",
          "description": "Weekly team sync - new time",
          "start_time": "2023-11-15T11:00:00",
          "end_time": "2023-11-15T12:00:00",
          "is_all_day": false,
          "repeat_frequency": "weekly",
          "repeat_until": "2024-07-31"
        }
        ```
    *   **`404 Not Found`**: If the event with the given ID does not exist.
        ```json
        {
          "detail": "Event not found"
        }
        ```
    *   **`422 Unprocessable Entity`**: If the request body or path parameter is invalid.

### 4. Delete Event

*   **Route:** `DELETE /events/{event_id}/`
*   **Description:** Deletes a specific event.
*   **Request Body:** None.
*   **Parameters:**
    *   `event_id` (Path, integer, required): The ID of the event to delete. Must be greater than 0.
*   **Server-Side State Change:** The row for the specified event is deleted from the `events` table.
*   **Responses:**
    *   **`204 No Content`**: Event deleted successfully.
    *   **`404 Not Found`**: If the event with the given ID does not exist.
        ```json
        {
          "detail": "Event not found"
        }
        ```
    *   **`422 Unprocessable Entity`**: If `event_id` is not a valid integer or not > 0.

---

## Expanded Event View Endpoint

### 1. Get Expanded Events

*   **Route:** `GET /events/expanded/`
*   **Description:** Retrieves all event occurrences (including expanded repeating events) within a given date range, optionally filtered by calendar.
*   **Request Body:** None.
*   **Parameters:**
    *   `start_date` (Query, string, required): Start date of the query range (Format: `YYYY-MM-DD`).
    *   `end_date` (Query, string, required): End date of the query range (Format: `YYYY-MM-DD`).
    *   `calendar_id` (Query, integer, optional): Filter events by a specific calendar ID.
*   **Server-Side State Change:** None.
*   **Responses:**
    *   **`200 OK`**: Successfully retrieved event occurrences.
        *   **Body:** `List[EventOccurrence]` (sorted by `start_time`)
        ```json
        [
          {
            "original_event_id": 101,
            "calendar_id": 1,
            "title": "Team Meeting",
            "description": "Weekly team sync",
            "start_time": "2023-11-15T10:00:00",
            "end_time": "2023-11-15T11:00:00",
            "is_all_day": false,
            "color": "#FF5733"
          },
          {
            "original_event_id": 102,
            "calendar_id": 1,
            "title": "Doctor Appointment",
            "description": "Annual check-up",
            "start_time": "2023-11-20T14:00:00",
            "end_time": "2023-11-20T15:00:00",
            "is_all_day": false,
            "color": "#FF5733"
          },
          {
            "original_event_id": 101, // Next occurrence of Team Meeting
            "calendar_id": 1,
            "title": "Team Meeting",
            "description": "Weekly team sync",
            "start_time": "2023-11-22T10:00:00",
            "end_time": "2023-11-22T11:00:00",
            "is_all_day": false,
            "color": "#FF5733"
          }
          // ... more occurrences
        ]
        ```
    *   **`400 Bad Request`**: If `start_date` is after `end_date`.
        ```json
        {
          "detail": "start_date cannot be after end_date"
        }
        ```
    *   **`422 Unprocessable Entity`**: If date formats are invalid or required parameters are missing.
