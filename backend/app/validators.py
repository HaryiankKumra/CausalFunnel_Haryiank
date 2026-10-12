"""
Input validation for event payloads.
Keeps validation logic separate from routes for clarity and testability.
"""

from datetime import datetime

# Only these event types are accepted
VALID_EVENT_TYPES = {"page_view", "click"}

# Fields required for every event
REQUIRED_FIELDS = {"session_id", "event_type", "page_url", "timestamp"}

# Additional fields required for click events
CLICK_FIELDS = {"x", "y", "viewport_width", "viewport_height"}


def validate_event(data):
    """
    Validate an incoming event payload.

    Returns:
        (cleaned_event_dict, None) on success
        (None, error_message_string) on failure
    """
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object."

    # --- Check required fields ---
    missing = REQUIRED_FIELDS - set(data.keys())
    if missing:
        return None, f"Missing required fields: {', '.join(sorted(missing))}"

    # --- Validate session_id ---
    session_id = data.get("session_id")
    if not isinstance(session_id, str) or not session_id.strip():
        return None, "session_id must be a non-empty string."

    # --- Validate event_type ---
    event_type = data.get("event_type")
    if event_type not in VALID_EVENT_TYPES:
        return None, f"event_type must be one of: {', '.join(sorted(VALID_EVENT_TYPES))}"

    # --- Validate page_url ---
    page_url = data.get("page_url")
    if not isinstance(page_url, str) or not page_url.strip():
        return None, "page_url must be a non-empty string."

    # --- Validate timestamp (ISO 8601) ---
    timestamp_str = data.get("timestamp")
    if not isinstance(timestamp_str, str):
        return None, "timestamp must be an ISO 8601 string."
    try:
        # Python 3.11+ handles 'Z' suffix, but for broader compatibility:
        ts = timestamp_str.replace("Z", "+00:00")
        parsed_ts = datetime.fromisoformat(ts)
    except (ValueError, TypeError):
        return None, "timestamp must be a valid ISO 8601 datetime string."

    # --- Build the cleaned event ---
    event = {
        "session_id": session_id.strip(),
        "event_type": event_type,
        "page_url": page_url.strip(),
        "timestamp": timestamp_str,  # Store original string for consistency
    }

    # --- Validate click-specific fields ---
    if event_type == "click":
        for field in CLICK_FIELDS:
            value = data.get(field)
            if value is None:
                return None, f"click events require the field: {field}"
            if not isinstance(value, (int, float)):
                return None, f"{field} must be a number."
            event[field] = value
    else:
        # page_view events: coordinates should be null
        event["x"] = None
        event["y"] = None
        event["viewport_width"] = data.get("viewport_width")
        event["viewport_height"] = data.get("viewport_height")

    return event, None
