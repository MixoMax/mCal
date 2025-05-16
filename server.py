import os
import sqlite3
import datetime
from typing import List, Optional, Literal, Any
from fastapi import FastAPI, HTTPException, Query, Path, File, UploadFile, Form # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.responses import FileResponse, JSONResponse # type: ignore
from pydantic import BaseModel, validator # type: ignore
from contextlib import asynccontextmanager
import calendar as py_calendar # To avoid conflict with our Calendar model
import base64
import io
from PIL import Image
from groq import Groq
import json

#%% --- Configuration ---
DATABASE_URL = "calendar.db"
MAX_REPEATING_OCCURRENCES = 500 # Safety limit for events without repeat_until

ai_model_name = "meta-llama/llama-4-scout-17b-16e-instruct"

def get_groq_api_key(filepath: str = "groq.token") -> str | None:
    """Reads the Groq API key from the specified file."""
    try:
        with open(filepath, "r") as f:
            key = f.read().strip()
            if key:
                return key
            else:
                print(f"Warning: {filepath} is empty.")
                return None
    except FileNotFoundError:
        print(f"Error: API key file not found at {filepath}")
        return None
    except Exception as e:
        print(f"Error reading API key from {filepath}: {e}")
        return None

client = Groq(api_key=get_groq_api_key())



# --- Database Setup ---
def get_db_connection():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row # Access columns by name
    conn.execute("PRAGMA foreign_keys = ON;") # Enforce foreign key constraints
    return conn

def create_tables():
    conn = get_db_connection()
    cursor = conn.cursor()
    # Calendars Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS calendars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT
    )
    """)
    # Events Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calendar_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT, -- New field
        start_time TEXT NOT NULL, -- ISO format YYYY-MM-DDTHH:MM:SS
        end_time TEXT NOT NULL,   -- ISO format YYYY-MM-DDTHH:MM:SS
        is_all_day BOOLEAN DEFAULT 0,
        repeat_frequency TEXT DEFAULT 'none', -- 'none', 'daily', 'weekly', 'monthly', 'yearly'
        repeat_until TEXT, -- ISO date string 'YYYY-MM-DD' or NULL
        FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE
    )
    """)
    conn.commit()
    conn.close()

#%% --- Pydantic Models ---
# Calendar Models
class CalendarBase(BaseModel):
    name: str
    color: Optional[str] = None

class CalendarCreate(CalendarBase):
    pass

class Calendar(CalendarBase):
    id: int

# Event Models
RepeatFrequency = Literal["none", "daily", "weekly", "monthly", "yearly"]

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None # New field
    start_time: datetime.datetime
    end_time: datetime.datetime
    is_all_day: bool = False
    repeat_frequency: RepeatFrequency = "none"
    repeat_until: Optional[datetime.date] = None

    @validator('end_time')
    def end_time_must_be_after_start_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be after start_time')
        return v

    @validator('start_time', 'end_time', pre=True)
    def parse_datetime(cls, value):
        dt = value
        if isinstance(value, str):
            dt = datetime.datetime.fromisoformat(value)
        
        if isinstance(dt, datetime.datetime) and dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None) # Make it naive, representing local time
        return dt

    @validator('repeat_until', pre=True)
    def parse_date(cls, value):
        if isinstance(value, str):
            return datetime.date.fromisoformat(value)
        return value
        
class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: int
    calendar_id: int

class EventOccurrence(BaseModel): # For expanded view
    original_event_id: int
    calendar_id: int
    title: str
    description: Optional[str] = None
    location: Optional[str] = None # New field
    start_time: datetime.datetime
    end_time: datetime.datetime
    is_all_day: bool
    color: Optional[str] = None # From the calendar

# AI Suggestion Model
class AISuggestPayload(BaseModel):
    text: Optional[str] = None
    image_b64: Optional[str] = None # Base64 encoded image

#%% --- FastAPI Application Setup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    create_tables()
    yield
    # Shutdown: (Optional: close db connections if you had a global pool)

app = FastAPI(lifespan=lifespan, title="Simple Calendar API")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

#%% --- Helper Functions ---
def _adjust_for_all_day(event_data: dict):
    """Adjusts start_time and end_time if is_all_day is true.
    Assumes event_data['start_time'] and event_data['end_time'] are datetime objects
    as they come from Pydantic model_dump. The modified datetime objects are
    stored back into event_data.
    """
    if event_data.get("is_all_day"):
        start_dt: Optional[datetime.datetime] = event_data.get("start_time")
        end_dt: Optional[datetime.datetime] = event_data.get("end_time")

        if isinstance(start_dt, datetime.datetime):
            event_data["start_time"] = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        
        if isinstance(end_dt, datetime.datetime):
            # For all-day events, end_time usually means *up to* the start of the next day.
            # Or, for simplicity in range queries, set it to the very end of the current day.
            event_data["end_time"] = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
    return event_data

def _db_event_to_model(db_row: sqlite3.Row) -> Event:
    start_time_str = db_row['start_time']
    end_time_str = db_row['end_time']
    
    start_time_dt = datetime.datetime.fromisoformat(start_time_str)
    if start_time_dt.tzinfo is not None:
        start_time_dt = start_time_dt.replace(tzinfo=None)

    end_time_dt = datetime.datetime.fromisoformat(end_time_str)
    if end_time_dt.tzinfo is not None:
        end_time_dt = end_time_dt.replace(tzinfo=None)
        
    repeat_until_val = db_row['repeat_until']
    repeat_until_dt = None
    if repeat_until_val:
        try:
            repeat_until_dt = datetime.date.fromisoformat(repeat_until_val)
        except ValueError: # Handle cases where it might not be a valid date string
            # Log or handle error as appropriate, for now, set to None
            print(f"Warning: Invalid date format for repeat_until ('{repeat_until_val}') for event ID {db_row['id']}. Setting to None.")
            pass

    return Event(
        id=db_row['id'],
        calendar_id=db_row['calendar_id'],
        title=db_row['title'],
        description=db_row['description'],
        location=db_row['location'],
        start_time=start_time_dt,
        end_time=end_time_dt,
        is_all_day=bool(db_row['is_all_day']),
        repeat_frequency=db_row['repeat_frequency'],
        repeat_until=repeat_until_dt
    )

def _event_to_json(event: Event) -> dict:
    # This function now expects event.start_time and event.end_time to be datetime objects
    # as per the Event model.
    return {
        "id": event.id,
        "calendar_id": event.calendar_id,
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "start_time": event.start_time.isoformat(),
        "end_time": event.end_time.isoformat(),
        "is_all_day": event.is_all_day,
        "repeat_frequency": event.repeat_frequency,
        "repeat_until": event.repeat_until.isoformat() if event.repeat_until else None
    }

def _calendar_to_json(calendar: Calendar) -> dict:
    return {
        "id": calendar.id,
        "name": calendar.name,
        "color": calendar.color
    }

#%% --- Calendar Endpoints ---
@app.post("/calendars", response_model=Calendar, status_code=201)
def create_calendar_api(calendar: CalendarCreate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO calendars (name, color) VALUES (?, ?)",
            (calendar.name, calendar.color)
        )
        conn.commit()
        calendar_id = cursor.lastrowid
        # Create a Calendar instance before passing to _calendar_to_json
        created_calendar = Calendar(id=calendar_id, name=calendar.name, color=calendar.color)
        return JSONResponse(content=_calendar_to_json(created_calendar), status_code=201)
    except sqlite3.IntegrityError: # For UNIQUE constraint on name
        raise HTTPException(status_code=400, detail=f"Calendar with name '{calendar.name}' already exists.")
    finally:
        conn.close()
        

@app.get("/calendars", response_model=List[Calendar])
def get_calendars_api():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, color FROM calendars")
    calendars_data = cursor.fetchall()
    conn.close()
    # Convert rows to Calendar models before serializing
    calendars_models = [Calendar(id=row['id'], name=row['name'], color=row['color']) for row in calendars_data]
    return JSONResponse(content=[_calendar_to_json(cal) for cal in calendars_models])

@app.post("/calendars/{calendar_id}/events", response_model=Event, status_code=201)
def create_event_api(calendar_id: int, event: EventCreate):
    # Ensure calendar exists
    get_calendar_api(calendar_id) # Will raise 404 if not found

    event_data = event.model_dump() # start_time, end_time are datetime objects here
    event_data = _adjust_for_all_day(event_data) # start_time, end_time are still datetime objects

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO events (calendar_id, title, description, location, start_time, end_time, 
                                is_all_day, repeat_frequency, repeat_until)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                calendar_id, event_data["title"], event_data["description"], event_data["location"],
                event_data["start_time"].isoformat(), # Convert to ISO string for DB
                event_data["end_time"].isoformat(),   # Convert to ISO string for DB
                event_data["is_all_day"], event_data["repeat_frequency"],
                event_data["repeat_until"].isoformat() if event_data["repeat_until"] else None
            )
        )
        conn.commit()
        event_id = cursor.lastrowid
        # Construct the full Event model for the response
        created_event_model = Event(
            id=event_id,
            calendar_id=calendar_id,
            **event_data # event_data still has datetime objects for times
        )
        return JSONResponse(content=_event_to_json(created_event_model), status_code=201)
    finally:
        conn.close()

@app.get("/calendars/{calendar_id}", response_model=Calendar)
def get_calendar_api(calendar_id: int = Path(..., gt=0)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, color FROM calendars WHERE id = ?", (calendar_id,))
    row = cursor.fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Calendar not found")
    # Convert row to Calendar model before serializing
    calendar_model = Calendar(id=row['id'], name=row['name'], color=row['color'])
    return JSONResponse(content=_calendar_to_json(calendar_model))

@app.put("/calendars/{calendar_id}", response_model=Calendar)
def update_calendar_api(calendar_id: int, calendar_update: CalendarCreate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE calendars SET name = ?, color = ? WHERE id = ?",
            (calendar_update.name, calendar_update.color, calendar_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Calendar not found")
        # Return the updated Calendar model
        updated_calendar = Calendar(id=calendar_id, name=calendar_update.name, color=calendar_update.color)
        return JSONResponse(content=_calendar_to_json(updated_calendar))
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail=f"Calendar with name '{calendar_update.name}' already exists.")
    finally:
        conn.close()

@app.delete("/calendars/{calendar_id}", status_code=204)
def delete_calendar_api(calendar_id: int = Path(..., gt=0)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM calendars WHERE id = ?", (calendar_id,))
    conn.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Calendar not found")
    conn.close()
    return None # No content

# --- Event Endpoints ---

# --- Event Expansion Endpoint ---
def generate_occurrences(
    base_event: Event,
    query_start_date: datetime.date,
    query_end_date: datetime.date,
    calendar_color: Optional[str]
) -> List[EventOccurrence]:
    occurrences = []
    
    # Convert query dates to datetimes for easier comparison
    query_range_start = datetime.datetime.combine(query_start_date, datetime.time.min)
    query_range_end = datetime.datetime.combine(query_end_date, datetime.time.max)

    current_start = base_event.start_time
    duration = base_event.end_time - base_event.start_time
    
    iteration_count = 0

    while iteration_count < MAX_REPEATING_OCCURRENCES:
        iteration_count +=1
        current_end = current_start + duration

        # Stop conditions for repeating events
        if base_event.repeat_frequency != "none":
            if base_event.repeat_until and current_start.date() > base_event.repeat_until:
                break
            if current_start > query_range_end : # Occurrence starts after our query window
                # Optimization: if event is daily/weekly etc. and already past query_range_end, no need to continue
                if base_event.repeat_frequency in ["daily", "weekly", "monthly", "yearly"]:
                     break 
        
        # Check if the current occurrence overlaps with the query range
        # Overlap: (StartA <= EndB) and (EndA >= StartB)
        if current_start <= query_range_end and current_end >= query_range_start:
            occurrences.append(EventOccurrence(
                original_event_id=base_event.id,
                calendar_id=base_event.calendar_id,
                title=base_event.title,
                description=base_event.description,
                location=base_event.location,
                start_time=current_start,
                end_time=current_end,
                is_all_day=base_event.is_all_day,
                color=calendar_color
            ))

        if base_event.repeat_frequency == "none":
            break # Only one occurrence for non-repeating events

        # Advance to the next potential start time
        if base_event.repeat_frequency == "daily":
            current_start += datetime.timedelta(days=1)
        elif base_event.repeat_frequency == "weekly":
            current_start += datetime.timedelta(weeks=1)
        elif base_event.repeat_frequency == "monthly":
            # Add one month, handling edge cases like Jan 31 -> Feb 28
            month = current_start.month + 1
            year = current_start.year
            if month > 12:
                month = 1
                year += 1
            day = current_start.day
            # Get the number of days in the target month
            _, num_days_in_month = py_calendar.monthrange(year, month)
            day = min(day, num_days_in_month) # Cap day if original day doesn't exist
            try:
                current_start = current_start.replace(year=year, month=month, day=day)
            except ValueError: # Should be rare due to day capping
                 # This can happen if e.g. Feb 29 in non-leap year, capped to 28.
                 # If something truly unexpected, break to be safe.
                 break 
        elif base_event.repeat_frequency == "yearly":
            try:
                current_start = current_start.replace(year=current_start.year + 1)
            except ValueError: # e.g. Feb 29 on a leap year, next year is not.
                current_start = current_start.replace(year=current_start.year + 1, day=28)
        else: # Should not happen due to Pydantic validation
            break
            
    if iteration_count >= MAX_REPEATING_OCCURRENCES and base_event.repeat_frequency != "none" and not base_event.repeat_until:
        print(f"Warning: Event ID {base_event.id} hit MAX_REPEATING_OCCURRENCES limit. Consider adding a repeat_until.")

    return occurrences

@app.get("/events/expanded", response_model=List[EventOccurrence])
def get_expanded_events_api(
    start_date: datetime.date = Query(..., description="Start date of the query range (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="End date of the query range (YYYY-MM-DD)"),
    calendar_id: Optional[int] = Query(None, description="Optional: Filter by a specific calendar ID")
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")

    conn = get_db_connection()
    cursor = conn.cursor()

    sql_query = """
    SELECT e.*, c.color as calendar_color 
    FROM events e
    JOIN calendars c ON e.calendar_id = c.id
    WHERE 
        date(e.start_time) <= ? 
        AND (
            e.repeat_frequency = 'none' OR 
            e.repeat_until IS NULL OR 
            date(e.repeat_until) >= ?
        )
    """
    params: List[Any] = [end_date.isoformat(), start_date.isoformat()]

    if calendar_id:
        sql_query += " AND e.calendar_id = ?"
        params.append(calendar_id)

    cursor.execute(sql_query, tuple(params))
    
    base_events_data = cursor.fetchall()
    conn.close()

    all_occurrences = []
    for row in base_events_data:
        base_event = _db_event_to_model(row) # Converts DB strings to Event model with datetimes
        calendar_color = row['calendar_color']
        
        occurrences = generate_occurrences(base_event, start_date, end_date, calendar_color)
        all_occurrences.extend(occurrences)

    all_occurrences.sort(key=lambda x: x.start_time)
    # EventOccurrence already has datetime objects, FastAPI will handle serialization.
    return all_occurrences

# --- ai suggestion endpoint ---
@app.post("/events/ai-suggest")
async def upload_data(payload: AISuggestPayload):
    if not payload.text and not payload.image_b64:
        raise HTTPException(status_code=400, detail="Either text or image_b64 must be provided.")

    text: str = payload.text if payload.text else ""
    image_b64: str = payload.image_b64 if payload.image_b64 else ""

    with open("./ai_tool.md", "r") as f:
        ai_tool_prompt = f.read()
    
    ai_tool_prompt = ai_tool_prompt.replace("[[REPLACE_CURRENT_DATE]]", datetime.datetime.now().strftime("%Y-%m-%d"))

    message_content: list[dict[str, str] | dict[str, dict[str, str]]] = [{
            "type": "text",
            "text": ai_tool_prompt.replace("[[REPLACE_EVENT_INFO]]", text)
        }]

    if image_b64:
        message_content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{image_b64}",
                }
            })
    
    completion = client.chat.completions.create(
        model=ai_model_name,
        messages=[
            {
                "role": "user",
                "content": message_content
            }
        ],
        temperature=1,
        max_tokens=4096,
        top_p=1,
        stream=False,
        stop=None
    )

    result_text: str = completion.choices[0].message.content

    with open("ai_tool_response.txt", "w", encoding="utf-8") as f:
        f.write(result_text)

    if result_text.count("```json") == 1 and result_text.count("```") == 2:
        json_text = result_text.split("```json")[1].split("```")[0].strip()
    else:
        return JSONResponse(content={"error": "Invalid response format."}, status_code=420)
    
    return JSONResponse(content=json.loads(json_text))

@app.put("/events/{event_id}", response_model=Event)
def update_event_api(event_id: int, event_update: EventCreate):
    # Fetch existing event to get its calendar_id and to ensure it exists
    # get_event_api returns a JSONResponse, we need the model.
    # So, let's fetch directly and convert.
    conn_check = get_db_connection()
    cursor_check = conn_check.cursor()
    cursor_check.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    row = cursor_check.fetchone()
    conn_check.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Event not found for update.")
    existing_event_model = _db_event_to_model(row)


    event_data = event_update.model_dump() # start_time, end_time are datetime objects
    event_data = _adjust_for_all_day(event_data) # start_time, end_time are still datetime objects

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE events SET title = ?, description = ?, location = ?, start_time = ?, end_time = ?,
                               is_all_day = ?, repeat_frequency = ?, repeat_until = ?
            WHERE id = ?
            """,
            (
                event_data["title"], event_data["description"], event_data["location"],
                event_data["start_time"].isoformat(), # Convert to ISO string for DB
                event_data["end_time"].isoformat(),   # Convert to ISO string for DB
                event_data["is_all_day"], event_data["repeat_frequency"],
                event_data["repeat_until"].isoformat() if event_data["repeat_until"] else None,
                event_id
            )
        )
        conn.commit()
        if cursor.rowcount == 0: # Should ideally not happen if initial check passed
            raise HTTPException(status_code=404, detail="Event not found during update (concurrent modification?).")
        
        # Construct the full Event model for the response
        updated_event_model = Event(
            id=event_id,
            calendar_id=existing_event_model.calendar_id, # Use original calendar_id
            **event_data # event_data has datetime objects for times
        )
        return JSONResponse(content=_event_to_json(updated_event_model))
    finally:
        conn.close()

@app.delete("/events/{event_id}", status_code=204)
def delete_event_api(event_id: int = Path(..., gt=0)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
    conn.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    conn.close()
    return None

@app.get("/events/{event_id}", response_model=Event)
def get_event_api(event_id: int = Path(..., gt=0)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    row = cursor.fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Event not found")
    # Convert row to Event model before serializing
    event_model = _db_event_to_model(row)
    return JSONResponse(content=_event_to_json(event_model))

@app.get("/{path:path}", include_in_schema=False)
def catch_all(path: str):
    if path == "":
        path = "index.html"
    if path == "favicon.ico":
        path = "favicon.png"
    
    # Ensure path is relative to web-frontend and secure
    safe_path = os.path.normpath(os.path.join("web-frontend", path))
    if not safe_path.startswith(os.path.normpath("web-frontend")):
        raise HTTPException(status_code=403, detail="Forbidden")

    if os.path.exists(safe_path) and os.path.isfile(safe_path):
        return FileResponse(safe_path)
    else:
        # Try serving index.html for SPA-like behavior if path is a directory or not found
        # but only if it's not an obvious file request with an extension
        if '.' not in path.split('/')[-1]: # if no extension in last path segment
            index_path = os.path.join("web-frontend", "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="File not found")

# --- To run the app (for development) ---
if __name__ == "__main__":
    import uvicorn # type: ignore
    import sys
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Warning: Invalid port '{sys.argv[1]}'. Using default port {port}.")

    print(f"Starting server on http://0.0.0.0:{port}")
    # Ensure create_tables is called before uvicorn starts if not using lifespan
    # create_tables() # Not needed if lifespan is correctly implemented and used

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
