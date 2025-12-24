

/**
 * Calculates the Manhattan distance between two points
 * @param {Object} p1 - {x, y}
 * @param {Object} p2 - {x, y}
 * @returns {number} Distance in pixels
 */
function calculateManhattanDistance(p1, p2) {
    return Math.abs(Number(p2.x) - Number(p1.x)) + Math.abs(Number(p2.y) - Number(p1.y));
}

/**
 * Service for calculating warehouse walk distance
 */
class WalkDistanceService {
    /**
     * Calculate walk distance for a given set of picks and route markers
     * @param {Array} picks - List of pick transactions with element coordinates
     * @param {Array} routeMarkers - List of route markers (Start, Stop, Cart Parking)
     * @returns {Object} Calculated distance metrics
     */
    static calculate(picks, routeMarkers) {
        const startPoint = routeMarkers.find(m => m.marker_type === 'start_point');
        const stopPoint = routeMarkers.find(m => m.marker_type === 'stop_point');
        const cartParking = routeMarkers
            .filter(m => m.marker_type === 'cart_parking')
            .map(m => ({
                id: m.id,
                x: Number(m.x_coordinate),
                y: Number(m.y_coordinate),
                label: m.label,
                sequence_order: m.sequence_order
            }));

        if (!startPoint || !stopPoint || cartParking.length === 0) {
            return {
                totalDistance: 0,
                cartTravelDist: 0,
                pedestrianTravelDist: 0,
                visitCount: 0,
                dailyBreakdown: [],
                missingMarkers: {
                    startPoint: !startPoint,
                    stopPoint: !stopPoint,
                    cartParking: cartParking.length === 0
                }
            };
        }

        // group picks by date
        const picksByDate = {};
        picks.forEach(pick => {
            // Normalize date string (YYYY-MM-DD)
            const date = pick.pick_date instanceof Date
                ? pick.pick_date.toISOString().split('T')[0]
                : (pick.pick_date || '').substring(0, 10);

            if (!picksByDate[date]) {
                picksByDate[date] = [];
            }
            picksByDate[date].push(pick);
        });

        let totalCartDist = 0;
        let totalPedestrianDist = 0;
        let totalVisits = 0;
        const dailyBreakdown = [];

        // Process each day independently
        Object.keys(picksByDate).sort().forEach(date => {
            const dailyResult = this.calculateDailyDistance(
                picksByDate[date],
                {
                    x: Number(startPoint.x_coordinate),
                    y: Number(startPoint.y_coordinate)
                },
                {
                    x: Number(stopPoint.x_coordinate),
                    y: Number(stopPoint.y_coordinate)
                },
                cartParking
            );

            totalCartDist += dailyResult.cartDist;
            totalPedestrianDist += dailyResult.pedestrianDist;
            totalVisits += dailyResult.visitCount;

            dailyBreakdown.push({
                date,
                ...dailyResult
            });
        });

        return {
            totalDistance: totalCartDist + totalPedestrianDist,
            cartTravelDist: totalCartDist,
            pedestrianTravelDist: totalPedestrianDist,
            visitCount: totalVisits,
            dailyBreakdown
        };
    }

    /**
     * Calculate distance for a single day
     */
    static calculateDailyDistance(dailyPicks, startPos, stopPos, cartParkingSpots) {
        // 1. Identify Unique Visits (Elements to be visited this day)
        // We assume 1 visit per element per day (Batching assumption)
        const uniqueElements = new Map();
        dailyPicks.forEach(pick => {
            if (!uniqueElements.has(pick.element_id)) {
                uniqueElements.set(pick.element_id, {
                    id: pick.element_id,
                    x: Number(pick.x_coordinate),
                    y: Number(pick.y_coordinate),
                    label: pick.element_label
                });
            }
        });

        const visits = Array.from(uniqueElements.values());
        if (visits.length === 0) {
            return { cartDist: 0, pedestrianDist: 0, visitCount: 0 };
        }

        // 2. Assign each visited element to the nearest parking spot
        const parkingSpotVisits = new Map(); // Map<parkingSpotId, Array<Element>>

        let pedestrianDist = 0;

        visits.forEach(element => {
            // Find nearest parking spot
            let nearestSpot = cartParkingSpots[0];
            let minDist = Infinity;

            cartParkingSpots.forEach(spot => {
                const d = calculateManhattanDistance(element, spot);
                if (d < minDist) {
                    minDist = d;
                    nearestSpot = spot;
                }
            });

            // Add pedestrian distance (Round trip: Spot -> Element -> Spot)
            pedestrianDist += (minDist * 2);

            // Record that this spot needs to be visited
            if (!parkingSpotVisits.has(nearestSpot.id)) {
                parkingSpotVisits.set(nearestSpot.id, {
                    spot: nearestSpot,
                    visits: []
                });
            }
            parkingSpotVisits.get(nearestSpot.id).visits.push(element);
        });

        // 3. Optimize Cart Path (TSP Heuristic / Nearest Neighbor)
        // Path: Start -> [Active Parking Spots Ordered] -> Stop
        const activeSpots = Array.from(parkingSpotVisits.values()).map(v => v.spot);

        // Sort active spots if they have sequence_order, otherwise use Nearest Neighbor
        const sortedSpots = this.sortSpots(startPos, activeSpots);

        let cartDist = 0;
        let currentPos = startPos;

        // Start -> First Spot
        if (sortedSpots.length > 0) {
            cartDist += calculateManhattanDistance(currentPos, sortedSpots[0]);
            currentPos = sortedSpots[0];

            // Spot -> Spot
            for (let i = 0; i < sortedSpots.length - 1; i++) {
                const dist = calculateManhattanDistance(sortedSpots[i], sortedSpots[i + 1]);
                cartDist += dist;
            }
            currentPos = sortedSpots[sortedSpots.length - 1];
        }

        // Last Spot -> Stop
        cartDist += calculateManhattanDistance(currentPos, stopPos);

        return {
            cartDist,
            pedestrianDist,
            visitCount: visits.length,
            activeSpotsCount: activeSpots.length
        };
    }

    /**
     * Sort parking spots for optimal logical routing
     * Uses sequence_order if available, otherwise simplified greedy approach
     */
    static sortSpots(startPos, spots) {
        // If all spots have a valid sequence order, use it
        const allHaveSequence = spots.every(s => s.sequence_order !== undefined && s.sequence_order !== null);

        if (allHaveSequence) {
            return [...spots].sort((a, b) => a.sequence_order - b.sequence_order);
        }

        // Otherwise: Greedy Nearest Neighbor
        const remaining = [...spots];
        const sorted = [];
        let current = startPos;

        while (remaining.length > 0) {
            let nearestIdx = -1;
            let minDist = Infinity;

            remaining.forEach((spot, idx) => {
                const d = calculateManhattanDistance(current, spot);
                if (d < minDist) {
                    minDist = d;
                    nearestIdx = idx;
                }
            });

            const nextSpot = remaining[nearestIdx];
            sorted.push(nextSpot);
            current = nextSpot;
            remaining.splice(nearestIdx, 1);
        }

        return sorted;
    }
}

module.exports = WalkDistanceService;
