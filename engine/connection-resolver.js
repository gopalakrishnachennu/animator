/**
 * Flow Animation Engine - Connection Resolver
 * Automatically calculates connection coordinates from component IDs
 * 
 * @module engine/connection-resolver
 * @version 1.0.0
 */

import { createLogger } from './logger.js';

const logger = createLogger('ConnectionResolver');

// =====================================================
// Component Geometry Helpers
// =====================================================

/**
 * Default dimensions for different component types
 */
const DEFAULT_DIMENSIONS = {
    rectangle: { width: 120, height: 60 },
    circle: { radius: 35 },
    diamond: { size: 60 },
    hexagon: { size: 40 },
    cylinder: { width: 80, height: 100 },
    cloud: { width: 120, height: 70 },
    server: { width: 60, height: 80 },
    database: { width: 60, height: 80 },
    user: { width: 56, height: 80 },
    gear: { size: 30 },
    container: { width: 200, height: 150 },
    zone: { width: 300, height: 200 }
};

/**
 * Connection point types
 */
const ConnectionPoint = {
    TOP: 'top',
    BOTTOM: 'bottom',
    LEFT: 'left',
    RIGHT: 'right',
    CENTER: 'center'
};

// =====================================================
// Geometry Calculations
// =====================================================

/**
 * Get the bounding box of a component
 * @param {Object} component - Component definition
 * @returns {Object} Bounding box {x, y, width, height, centerX, centerY}
 */
function getComponentBounds(component) {
    const type = component.type || 'rectangle';
    const defaults = DEFAULT_DIMENSIONS[type] || DEFAULT_DIMENSIONS.rectangle;

    let x, y, width, height;

    // Get position
    if (Array.isArray(component.position)) {
        [x, y] = component.position;
    } else if (component.position) {
        x = component.position.x || component.x || 0;
        y = component.position.y || component.y || 0;
    } else {
        x = component.x || 0;
        y = component.y || 0;
    }

    // Get size based on type
    if (Array.isArray(component.size)) {
        [width, height] = component.size;
    } else if (typeof component.size === 'number') {
        // For symmetric shapes like hexagon, diamond
        width = component.size * 2;
        height = component.size * 2;
    } else {
        width = component.width || defaults.width || (defaults.size ? defaults.size * 2 : 60);
        height = component.height || defaults.height || (defaults.size ? defaults.size * 2 : 60);

        // Special handling for circle
        if (type === 'circle' && component.radius) {
            width = component.radius * 2;
            height = component.radius * 2;
        }
    }

    // Adjust position based on component type (some are centered, some are top-left)
    let adjustedX = x;
    let adjustedY = y;

    // These types use center coordinates
    const centeredTypes = ['circle', 'diamond', 'hexagon', 'user', 'database', 'gear'];
    if (centeredTypes.includes(type)) {
        adjustedX = x - width / 2;
        adjustedY = y - height / 2;
    }

    return {
        x: adjustedX,
        y: adjustedY,
        width,
        height,
        centerX: adjustedX + width / 2,
        centerY: adjustedY + height / 2
    };
}

/**
 * Get a specific connection point on a component
 * @param {Object} bounds - Component bounding box
 * @param {string} point - Connection point type
 * @returns {Object} {x, y} coordinates
 */
function getConnectionPoint(bounds, point) {
    switch (point) {
        case ConnectionPoint.TOP:
            return { x: bounds.centerX, y: bounds.y };
        case ConnectionPoint.BOTTOM:
            return { x: bounds.centerX, y: bounds.y + bounds.height };
        case ConnectionPoint.LEFT:
            return { x: bounds.x, y: bounds.centerY };
        case ConnectionPoint.RIGHT:
            return { x: bounds.x + bounds.width, y: bounds.centerY };
        case ConnectionPoint.CENTER:
        default:
            return { x: bounds.centerX, y: bounds.centerY };
    }
}

/**
 * Determine the best connection points between two components
 * @param {Object} fromBounds - Source component bounds
 * @param {Object} toBounds - Target component bounds
 * @returns {Object} {from: {x, y}, to: {x, y}}
 */
function calculateOptimalConnectionPoints(fromBounds, toBounds) {
    const dx = toBounds.centerX - fromBounds.centerX;
    const dy = toBounds.centerY - fromBounds.centerY;

    let fromPoint, toPoint;

    // Determine primary direction
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal connection
        if (dx > 0) {
            fromPoint = ConnectionPoint.RIGHT;
            toPoint = ConnectionPoint.LEFT;
        } else {
            fromPoint = ConnectionPoint.LEFT;
            toPoint = ConnectionPoint.RIGHT;
        }
    } else {
        // Vertical connection
        if (dy > 0) {
            fromPoint = ConnectionPoint.BOTTOM;
            toPoint = ConnectionPoint.TOP;
        } else {
            fromPoint = ConnectionPoint.TOP;
            toPoint = ConnectionPoint.BOTTOM;
        }
    }

    return {
        from: getConnectionPoint(fromBounds, fromPoint),
        to: getConnectionPoint(toBounds, toPoint)
    };
}

// =====================================================
// Main Resolver Class
// =====================================================

export class ConnectionResolver {
    constructor() {
        this.componentMap = new Map();
        this.zoneMap = new Map();
    }

    /**
     * Register all components from a scenario
     * @param {Array} components - Array of component definitions
     */
    registerComponents(components) {
        logger.debug('Registering components', { count: components?.length || 0 });

        this.componentMap.clear();

        if (!components) return;

        components.forEach(comp => {
            if (comp.id) {
                this.componentMap.set(comp.id, comp);
            }
        });

        logger.info(`Registered ${this.componentMap.size} components`);
    }

    /**
     * Register all zones from a scenario
     * @param {Array} zones - Array of zone definitions
     */
    registerZones(zones) {
        logger.debug('Registering zones', { count: zones?.length || 0 });

        this.zoneMap.clear();

        if (!zones) return;

        zones.forEach(zone => {
            if (zone.id) {
                this.zoneMap.set(zone.id, zone);
            }
        });

        logger.info(`Registered ${this.zoneMap.size} zones`);
    }

    /**
     * Get a component by ID
     * @param {string} id - Component ID
     * @returns {Object|null} Component or null if not found
     */
    getComponent(id) {
        return this.componentMap.get(id) || this.zoneMap.get(id) || null;
    }

    /**
     * Resolve connection coordinates from IDs
     * @param {Object} connection - Connection definition with from/to as IDs or coordinates
     * @returns {Object} Connection with resolved coordinates
     */
    resolveConnection(connection) {
        const resolved = { ...connection };

        // Resolve 'from'
        if (typeof connection.from === 'string') {
            const fromComp = this.getComponent(connection.from);
            if (fromComp) {
                const fromBounds = getComponentBounds(fromComp);
                const toValue = typeof connection.to === 'string'
                    ? this.getComponent(connection.to)
                    : connection.to;

                if (toValue) {
                    const toBounds = typeof connection.to === 'string'
                        ? getComponentBounds(toValue)
                        : { centerX: toValue.x, centerY: toValue.y, x: toValue.x, y: toValue.y, width: 0, height: 0 };

                    const points = calculateOptimalConnectionPoints(fromBounds, toBounds);
                    resolved.from = points.from;
                    resolved.to = points.to;
                } else {
                    // Use center if target not resolvable
                    resolved.from = { x: fromBounds.centerX, y: fromBounds.centerY };
                }
            } else {
                logger.warn(`Could not resolve connection 'from': ${connection.from}`);
            }
        }

        // Resolve 'to' if still a string
        if (typeof resolved.to === 'string') {
            const toComp = this.getComponent(connection.to);
            if (toComp) {
                const toBounds = getComponentBounds(toComp);
                resolved.to = { x: toBounds.centerX, y: toBounds.centerY };
            } else {
                logger.warn(`Could not resolve connection 'to': ${connection.to}`);
            }
        }

        logger.debug(`Resolved connection: ${connection.id}`, resolved);
        return resolved;
    }

    /**
     * Resolve all connections in a scenario
     * @param {Array} connections - Array of connections to resolve
     * @returns {Array} Connections with resolved coordinates
     */
    resolveAllConnections(connections) {
        if (!connections) return [];

        logger.time('Connection resolution');

        const resolved = connections.map(conn => this.resolveConnection(conn));

        logger.timeEnd('Connection resolution');
        logger.info(`Resolved ${resolved.length} connections`);

        return resolved;
    }

    /**
     * Transform a scenario with ID-based connections to coordinate-based
     * @param {Object} scenario - Scenario with ID-based connections
     * @returns {Object} Scenario with resolved connections
     */
    transformScenario(scenario) {
        logger.info('Transforming scenario connections');

        // Register components and zones
        this.registerComponents(scenario.components);
        this.registerZones(scenario.zones);

        // Create transformed scenario
        const transformed = { ...scenario };

        // Resolve connections
        if (scenario.connections) {
            transformed.connections = this.resolveAllConnections(scenario.connections);
        }

        return transformed;
    }
}

// =====================================================
// Factory Function
// =====================================================

/**
 * Create a new ConnectionResolver instance
 * @returns {ConnectionResolver}
 */
export function createConnectionResolver() {
    return new ConnectionResolver();
}

export default ConnectionResolver;
