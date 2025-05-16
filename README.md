# Mixomax mCal - AI-Powered Calendar App

Mixomax mCal is a modern calendar application with a standout feature: **AI-powered event creation**. Simply describe your event in natural language, or even provide an image, and let the AI suggest the event details for you. It also includes a handy browser extension to quickly capture events from your clipboard.

## ✨ Features

*   **Full Calendar Functionality:**
    *   Create, view, update, and delete multiple calendars.
    *   Manage events with titles, descriptions, locations, start/end times, and all-day options.
    *   Support for repeating events (daily, weekly, monthly, yearly) with "repeat until" dates.
    *   Month and Week views for displaying events.
    *   Mini calendar for quick navigation.
*   **🤖 AI Event Suggestion (Special Feature):**
    *   **Natural Language Input:** Type a sentence like "Lunch with team next Tuesday at 1 PM at the new cafe" and the AI will parse it into a structured event.
    *   **Image-Based Input:** Upload an image (e.g., a poster, an invitation screenshot) and the AI will attempt to extract event details.
    *   Powered by the Groq API using advanced language models (e.g., Llama).
    *   Handles single or multiple event suggestions from one input.
*   **📋 Browser Extension (mCal Upcoming Events):**
    *   Monitors your clipboard for text or images.
    *   Allows you to send clipboard content directly to the AI for event suggestion.
    *   Quickly add AI-suggested events to your mCal.
*   **User-Friendly Interface:**
    *   Dark-themed, Proton Calendar-inspired design.
    *   Intuitive modals for creating and managing calendars and events.
*   **Backend:**
    *   Robust FastAPI backend server.
    *   SQLite database for persistent storage.
    *   Well-defined API (see `docs/api_doc.md`).

## 📂 Project Structure

```
└── mixomax-mcal/
    ├── server.py             # FastAPI backend server
    ├── ai_tool.md            # IMPORTANT: Prompt template for the Groq AI
    ├── groq.token            # (You need to create this) Groq API Key
    ├── calendar.db           # SQLite database (created automatically)
    ├── docs/
    │   ├── ai_suggestion.md  # Detailed explanation of the AI feature
    │   ├── api_doc.md        # API documentation
    │   └── style_guide.md    # Frontend style guide
    ├── mCal-extension/       # Browser extension files
    │   ├── manifest.json
    │   ├── popup.css
    │   ├── popup.html
    │   └── popup.js
    └── web-frontend/         # Frontend application files
        ├── index.html
        ├── script.js
        └── style.css
```
*(Note: `ai_tool.md` and `groq.token` are crucial and should be at the root level alongside `server.py`)*

## 🛠️ Technology Stack

*   **Backend:** Python, FastAPI, Uvicorn, SQLite, Pydantic, Groq SDK
*   **Frontend:** HTML, CSS, JavaScript (Vanilla JS)
*   **Browser Extension:** Standard WebExtension technologies (HTML, CSS, JS)
*   **AI:** Groq API (for fast LLM inference)

## 🚀 Getting Started

### Prerequisites

*   Python 3.8+
*   pip (Python package installer)
*   A Groq API Key
*   Optionally: Firefox for the browser extension

### Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/MixoMax/mCal.git
    cd mCal
    ```
2.  **Install dependencies:**
    ```bash
    pip install fastapi uvicorn pydantic groq "python-multipart" Pillow
    ```
    *(Pillow is included as it's imported in `server.py`, though not directly used in the AI suggestion endpoint for image processing from base64. `python-multipart` is generally useful for FastAPI form data/file uploads.)*

3.  **Set up Groq API Key:**
    *   Create a file named `groq.token` in the root directory (`mixomax-mcal/`).
    *   Paste your Groq API key into this file and save it. The file should contain only the key.

4.  **Run the backend server:**
    ```bash
    python server.py
    ```
    By default, the server runs on `http://0.0.0.0:8000`. You can specify a port:
    ```bash
    python server.py [port]
    ```
    The server will also serve the frontend application.

### Frontend Access

*   Once the backend server is running, open your web browser and go to: `http://localhost:8000` (or the port you specified).

### Browser Extension Setup (mCal AI Events) 

TUTORIAL COMING SOON!

The Extensions is in heavy development and not yet fully functional. Right now i run it using Firefox Developer Edition with the `about:debugging` page. You can load the extension temporarily for testing.  

Also see [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/) for more information on how to run the extension in a development environment.

## 💡 Usage

### Web Application (mCal)

*   **Managing Calendars:**
    *   Click the **"+"** button next to "My calendars" in the sidebar to create a new calendar.
    *   Edit or delete calendars using the buttons next to each calendar name.
    *   Select/deselect calendars using checkboxes to filter events shown in the main view.
*   **Managing Events:**
    *   Click the **"New event"** button in the sidebar to open the event creation modal.
    *   Fill in the event details (title, description, location, start/end times, etc.).
    *   Select the calendar for the event.
    *   Set recurrence rules if needed.
    *   Click on an existing event in the calendar view to edit or delete it.
*   **Using AI Event Suggestion:**
    1.  Click the **"Add event AI"** button in the sidebar.
    2.  In the "Create Event with AI" modal:
        *   Enter a natural language description of your event in the "Text Input" field (e.g., "Meet Sarah for coffee tomorrow at 10am at Starbucks").
        *   Optionally, upload an image containing event information (e.g., a flyer, an invitation screenshot). You can also drag & drop or paste an image.
        *   Click **"Get AI Suggestion"**.
    3.  The "AI Event Proposal" modal will appear, showing the AI's interpretation of your input as a JSON object.
        *   If multiple events are suggested, they will be shown one by one.
    4.  Review the proposal:
        *   Click **"Add Event"** to accept the current proposal and add it to your calendar (it will try to match `calendar_name` or use the first available calendar).
        *   Click **"Skip"** to discard the current proposal and move to the next one (if any).
    5.  Once all proposals are processed, the modal closes, and your calendar view will refresh.

### Browser Extension (mCal AI Events) 

1.  Click the "mCal AI Events" icon in your browser toolbar to open the popup.
2.  The popup will attempt to read your clipboard content (text or image).
    *   *Permission*: You might need to grant clipboard access permission.
3.  If new content is detected in your clipboard, a preview (text or image) will be shown in the popup.
4.  Click **"Get AI Suggestion for this Content"**.
5.  The AI's suggestion(s) will be displayed.
    *   **Initial Suggestion:** A raw JSON preview is shown.
        *   Click **"Accept"**: Tries to create the event. If there are more suggestions, the next one is presented in a modal.
        *   Click **"Deny"**: Skips this suggestion. If there are more, the next one is presented in a modal.
    *   **Subsequent Suggestions (Modal):**
        *   Review the event details.
        *   Click **"Add Event"** to create it.
        *   Click **"Skip"** to ignore it.
6.  Events are added to one of your calendars in the main mCal application (logic similar to web app AI).

## 🧠 AI Suggestion Feature - How it Works

The AI event suggestion feature is a core part of Mixomax mCal. It leverages a Large Language Model (LLM) through the Groq API.

1.  **Input:** The user provides either text or an image through the web app or the browser extension.
2.  **Backend Processing (`/events/ai-suggest`):**
    *   The backend receives the text and/or base64 encoded image.
    *   It reads a prompt template from `ai_tool.md`. This template guides the AI on how to interpret the input and the desired JSON output format.
    *   The current date and user's text are injected into this prompt.
    *   If an image is provided, it's included in the data sent to the AI.
3.  **Groq API Call:** The composed prompt (and image data) is sent to the configured LLM via the Groq API.
4.  **AI Response:** The LLM processes the input and returns its suggestion, ideally as a JSON object (or an array of objects) matching the schema defined in `ai_tool.md`.
5.  **Output to Frontend:** The backend parses the AI's response and forwards the JSON suggestion(s) to the frontend (web app or extension) for the user to review and accept.

For a more detailed technical breakdown of the AI suggestion workflow, including a sequence diagram, please refer to `docs/ai_suggestion.md`.

The `ai_tool.md` file is critical. It contains instructions for the AI model, including the expected JSON output structure:
```json
{
  "title": "Event Title",
  "description": "Optional event description",
  "location": "Optional event location",
  "start_time": "YYYY-MM-DDTHH:MM:SS.msZ", // Local time
  "end_time": "YYYY-MM-DDTHH:MM:SS.msZ",   // Local time
  "is_all_day": false,
  "repeat_frequency": "none", // or "daily", "weekly", "monthly", "yearly"
  "repeat_until": "YYYY-MM-DD" // Optional
}
```
Or an array of such objects.

## 📄 API Documentation

The backend provides a RESTful API for managing calendars and events. For detailed information on endpoints, request/response formats, and data models, please see:
➡️ `docs/api_doc.md`

Key endpoints include:
*   `POST /calendars`: Create a new calendar.
*   `GET /calendars`: List all calendars.
*   `POST /calendars/{calendar_id}/events`: Create an event in a specific calendar.
*   `GET /events/expanded?start_date=...&end_date=...`: Get all event occurrences in a date range.
*   `POST /events/ai-suggest`: Get AI event suggestions.

## 🎨 Frontend Style Guide

The frontend design aims for a clean, dark-themed interface. Styling conventions, color palette, typography, and component styling are documented in:
➡️ `docs/style_guide.md`

## Future Enhancements (Ideas)

*   User authentication.
*   Sharing calendars.
*   Google Calendar/Outlook Calendar integration.
*   More sophisticated AI error handling and feedback.
*   Customizable reminders/notifications.

## Contributing

We welcome contributions! If you have ideas, bug fixes, or enhancements, please create a pull request or open an issue.  
