"""
Input validation for event payloads.
Keeps validation logic separate from routes for clarity and testability.
"""

from datetime import datetime
import math

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
    if len(session_id.strip()) > 128:
        return None, "session_id must be 128 characters or fewer."

    # --- Validate event_type ---
    event_type = data.get("event_type")
    if event_type not in VALID_EVENT_TYPES:
        return None, f"event_type must be one of: {', '.join(sorted(VALID_EVENT_TYPES))}"

    # --- Validate page_url ---
    page_url = data.get("page_url")
    if not isinstance(page_url, str) or not page_url.strip():
        return None, "page_url must be a non-empty string."
    if len(page_url.strip()) > 2048:
        return None, "page_url must be 2048 characters or fewer."

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
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                return None, f"{field} must be a number."
            if not math.isfinite(value):
                return None, f"{field} must be a finite number."
            event[field] = value
        if event["viewport_width"] <= 0 or event["viewport_height"] <= 0:
            return None, "viewport dimensions must be greater than zero."
        if not 0 <= event["x"] <= event["viewport_width"]:
            return None, "x must be within the viewport width."
        if not 0 <= event["y"] <= event["viewport_height"]:
            return None, "y must be within the viewport height."
    else:
        # page_view events: coordinates should be null
        event["x"] = None
        event["y"] = None
        for field in ("viewport_width", "viewport_height"):
            value = data.get(field)
            if value is not None:
                if isinstance(value, bool) or not isinstance(value, (int, float)):
                    return None, f"{field} must be a number."
                if not math.isfinite(value) or value <= 0:
                    return None, f"{field} must be a finite number greater than zero."
            event[field] = value

    return event, None
