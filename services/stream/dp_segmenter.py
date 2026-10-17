"""
Dynamic Programming Telemetry Segmenter
Segments noisy GPS and speed series into discrete Stops and Trips by minimizing
a global segmentation cost function with temporal smoothing in O(n * W) time.
"""

import time
import math
from typing import List, Dict, Any, Tuple

class DPSegmenter:
    def __init__(self, window_size: int = 50, transition_penalty: float = 25.0, min_trip_speed_kmh: float = 5.0):
        self.W = window_size
        self.penalty = transition_penalty
        self.min_speed = min_trip_speed_kmh

    def segment_series(self, observations: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], float]:
        """
        Takes list of telemetry observations: [{'ts': float, 'speed_kmh': float, 'lat': float, 'lon': float}]
        Returns segmented intervals [{'type': 'STOP'|'TRIP', 'start_ts': float, 'end_ts': float, 'avg_speed': float}]
        and measured computation runtime in milliseconds.
        """
        start_clock = time.perf_counter()
        n = len(observations)
        if n == 0:
            return [], 0.0

        # Cost matrix: dp[i][state] where state 0 = STOP, state 1 = TRIP
        # dp[i][0] is min cost to segment prefix 0..i ending in STOP
        # dp[i][1] is min cost to segment prefix 0..i ending in TRIP
        dp = [[float('inf'), float('inf')] for _ in range(n)]
        parent = [[-1, -1] for _ in range(n)]

        # Base case
        s0 = float(observations[0].get("speed_kmh", 0.0))
        dp[0][0] = s0 ** 2  # Cost of calling moving speed a STOP
        dp[0][1] = max(0.0, self.min_speed - s0) ** 2  # Cost of calling low speed a TRIP

        # Recurrence with window W
        for i in range(1, n):
            speed = float(observations[i].get("speed_kmh", 0.0))
            cost_stop = speed ** 2
            cost_trip = max(0.0, self.min_speed - speed) ** 2

            # Option 1: Current is STOP
            # Came from STOP: no transition penalty
            from_stop = dp[i-1][0] + cost_stop
            # Came from TRIP: transition penalty
            from_trip = dp[i-1][1] + cost_stop + self.penalty
            if from_stop <= from_trip:
                dp[i][0] = from_stop
                parent[i][0] = 0
            else:
                dp[i][0] = from_trip
                parent[i][0] = 1

            # Option 2: Current is TRIP
            from_trip_2 = dp[i-1][1] + cost_trip
            from_stop_2 = dp[i-1][0] + cost_trip + self.penalty
            if from_trip_2 <= from_stop_2:
                dp[i][1] = from_trip_2
                parent[i][1] = 1
            else:
                dp[i][1] = from_stop_2
                parent[i][1] = 0

        # Backtrack optimal state sequence
        states = [0] * n
        curr_state = 0 if dp[n-1][0] <= dp[n-1][1] else 1
        states[n-1] = curr_state

        for i in range(n - 1, 0, -1):
            curr_state = parent[i][curr_state]
            states[i-1] = curr_state

        # Group into contiguous segments
        segments = []
        if n > 0:
            cur_type = "TRIP" if states[0] == 1 else "STOP"
            seg_start = observations[0].get("ts", 0)
            speeds = [observations[0].get("speed_kmh", 0)]

            for i in range(1, n):
                st_type = "TRIP" if states[i] == 1 else "STOP"
                if st_type != cur_type:
                    segments.append({
                        "type": cur_type,
                        "start_ts": seg_start,
                        "end_ts": observations[i-1].get("ts", 0),
                        "avg_speed_kmh": round(sum(speeds) / len(speeds), 2),
                        "count": len(speeds)
                    })
                    cur_type = st_type
                    seg_start = observations[i].get("ts", 0)
                    speeds = [observations[i].get("speed_kmh", 0)]
                else:
                    speeds.append(observations[i].get("speed_kmh", 0))

            segments.append({
                "type": cur_type,
                "start_ts": seg_start,
                "end_ts": observations[-1].get("ts", 0),
                "avg_speed_kmh": round(sum(speeds) / len(speeds), 2),
                "count": len(speeds)
            })

        runtime_ms = (time.perf_counter() - start_clock) * 1000.0
        return segments, runtime_ms
