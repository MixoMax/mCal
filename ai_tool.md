Given the following tool description, return a valid JSON object that can be used to call the tool.  
The tool is a calendar event creation API. It allows users to create events in their calendar with specific details such as title, description, start and end times, and recurrence options.  

type: Time = "{YYYY}-{MM}-{DD}T{HH}:{MM}:{SS}.{ms}Z"

POST BODY: {
    "title": str,
    "description": str,
    "location": str,
    "start_time": Time,
    "end_time": Time,
    "is_all_day": bool,
    "repeat_frequency": "daily" | "weekly" | "monthly" | "yearly" | None,
    "repeat_until": Time | None
}

Use the information from either the event info below or an attached image. If there is no image AND no information, return an empty JSON object.
If there is information for more then just one event, return an array of JSON objects.
Make absolutely sure to start your JSON block with "```json" and end it with "```"!
Only have one (1) JSON block in your response and dont use the json delimiters ("```json" and "```") anywhere else!

The current date is [[REPLACE_CURRENT_DATE]].

Event Info:  

[[REPLACE_EVENT_INFO]]