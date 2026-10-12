"""
MongoDB data-access layer.
All database operations are centralised here so routes stay clean
and the data layer can be tested or swapped independently.
"""

from pymongo import ASCENDING, DESCENDING


def get_collection(db):
    """Return the 'events' collection from the given database."""
    return db["events"]


def ensure_indexes(db):
    """
    Create indexes on the events collection.
    Called once when the app starts. MongoDB silently skips
    indexes that already exist, so this is safe to call repeatedly.
    """
    collection = get_collection(db)

    # Fast session lookups sorted by time (for user journey)
    collection.create_index(
        [("session_id", ASCENDING), ("timestamp", ASCENDING)],
        name="idx_session_timestamp",
    )

    # Fast heatmap queries: clicks on a specific page
    collection.create_index(
        [("page_url", ASCENDING), ("event_type", ASCENDING)],
        name="idx_page_event_type",
    )

    # Recent-activity sorting
    collection.create_index(
        [("timestamp", DESCENDING)],
        name="idx_timestamp_desc",
    )


# --------------- CRUD Operations ---------------


def insert_event(db, event_doc):
    """Insert a single event document. Returns the inserted ID."""
    result = get_collection(db).insert_one(event_doc)
    return str(result.inserted_id)


def get_sessions(db):
    """
    Return a summary of all sessions using MongoDB aggregation.

    Pipeline:
      1. Group by session_id → count totals, page_views, clicks, last_activity
      2. Sort by last_activity descending (most recent first)

    This runs entirely inside MongoDB — we never pull raw events into Python.
    """
    pipeline = [
        {
            "$group": {
                "_id": "$session_id",
                "total_events": {"$sum": 1},
                "page_views": {
                    "$sum": {"$cond": [{"$eq": ["$event_type", "page_view"]}, 1, 0]}
                },
                "clicks": {
                    "$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}
                },
                "last_activity": {"$max": "$timestamp"},
            }
        },
        {"$sort": {"last_activity": -1}},
        {
            "$project": {
                "_id": 0,
                "session_id": "$_id",
                "total_events": 1,
                "page_views": 1,
                "clicks": 1,
                "last_activity": 1,
            }
        },
    ]
    return list(get_collection(db).aggregate(pipeline))


def get_session_events(db, session_id):
    """Return all events for a session, sorted chronologically."""
    cursor = (
        get_collection(db)
        .find({"session_id": session_id}, {"_id": 0})
        .sort("timestamp", ASCENDING)
    )
    return list(cursor)


def get_heatmap_data(db, page_url):
    """
    Return click events for a specific page URL.
    Matches exact URL or URL with anchor fragments.
    """
    import re
    clean_url = page_url.split("#")[0].rstrip("/")
    url_pattern = re.compile(rf"^{re.escape(clean_url)}(/|#.*)?$")
    cursor = get_collection(db).find(
        {"page_url": {"$regex": url_pattern}, "event_type": "click"},
        {
            "_id": 0,
            "x": 1,
            "y": 1,
            "viewport_width": 1,
            "viewport_height": 1,
            "timestamp": 1,
        },
    )
    return list(cursor)


def get_distinct_page_urls(db):
    """Return a list of distinct cleaned page URLs that have tracked events."""
    raw_urls = get_collection(db).distinct("page_url")
    cleaned = sorted(list(set(u.split("#")[0] for u in raw_urls if u)))
    return cleaned


def get_overview_stats(db):
    """
    Return aggregate overview stats using a single aggregation pipeline.
    """
    pipeline = [
        {
            "$facet": {
                "totals": [
                    {
                        "$group": {
                            "_id": None,
                            "total_events": {"$sum": 1},
                            "page_views": {
                                "$sum": {
                                    "$cond": [
                                        {"$eq": ["$event_type", "page_view"]},
                                        1,
                                        0,
                                    ]
                                }
                            },
                            "clicks": {
                                "$sum": {
                                    "$cond": [
                                        {"$eq": ["$event_type", "click"]},
                                        1,
                                        0,
                                    ]
                                }
                            },
                            "total_sessions": {"$addToSet": "$session_id"},
                        }
                    }
                ],
                "recent": [
                    {"$sort": {"timestamp": -1}},
                    {"$limit": 10},
                    {
                        "$project": {
                            "_id": 0,
                            "session_id": 1,
                            "event_type": 1,
                            "page_url": 1,
                            "timestamp": 1,
                        }
                    },
                ],
            }
        }
    ]
    result = list(get_collection(db).aggregate(pipeline))
    if not result:
        return {
            "total_sessions": 0,
            "total_events": 0,
            "page_views": 0,
            "clicks": 0,
            "recent_activity": [],
        }

    facets = result[0]
    totals = facets["totals"][0] if facets["totals"] else {}

    return {
        "total_sessions": len(totals.get("total_sessions", [])),
        "total_events": totals.get("total_events", 0),
        "page_views": totals.get("page_views", 0),
        "clicks": totals.get("clicks", 0),
        "recent_activity": facets.get("recent", []),
    }
