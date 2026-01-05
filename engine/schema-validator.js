/**
 * Flow Animation Engine - Schema Validator
 * Validates YAML/JSON scenario structure with detailed error reporting
 * 
 * @module engine/schema-validator
 * @version 1.0.0
 */

import { createLogger } from './logger.js';

const logger = createLogger('SchemaValidator');

// =====================================================
// Validation Result Class
// =====================================================

export class ValidationResult {
    constructor() {
        this.valid = true;
        this.errors = [];
        this.warnings = [];
    }

    addError(path, message, value = undefined) {
        this.valid = false;
        this.errors.push({ path, message, value, type: 'error' });
        return this;
    }

    addWarning(path, message, value = undefined) {
        this.warnings.push({ path, message, value, type: 'warning' });
        return this;
    }

    merge(other) {
        if (!other.valid) this.valid = false;
        this.errors.push(...other.errors);
        this.warnings.push(...other.warnings);
        return this;
    }

    toSummary() {
        return {
            valid: this.valid,
            errorCount: this.errors.length,
            warningCount: this.warnings.length,
            errors: this.errors,
            warnings: this.warnings
        };
    }
}

// =====================================================
// Schema Definitions
// =====================================================

const VALID_COMPONENT_TYPES = [
    'rectangle', 'circle', 'diamond', 'hexagon', 'cylinder', 'cloud',
    'server', 'database', 'user', 'gear', 'container', 'arrow-right'
];

const VALID_CONNECTION_TYPES = ['arrow', 'curve', 'orthogonal', 'line'];

const VALID_ANIMATION_TYPES = [
    'fadeIn', 'fadeOut', 'appear', 'moveTo', 'scale', 'pulse',
    'highlight', 'unhighlight', 'drawLine', 'wait', 'color',
    // v2.4: New Animation Types
    'rotate', 'bounce', 'shake', 'glow', 'unglow', 'blink', 'grow', 'shrink',
    'callout'
];

const VALID_LAYOUT_PROFILES = ['pipeline', 'hub', 'tiered', 'fanout', 'swimlane'];
const VALID_LAYOUT_DIRECTIONS = ['LR', 'TB'];
const VALID_LAYOUT_GROUPING = ['zone', 'flow', 'type'];

// =====================================================
// Validator Functions
// =====================================================

/**
 * Validate a position array [x, y]
 */
function validatePosition(value, path, result) {
    if (!Array.isArray(value)) {
        if (typeof value === 'object' && value.x !== undefined && value.y !== undefined) {
            return true; // Accept {x, y} format
        }
        result.addError(path, 'Position must be an array [x, y] or object {x, y}', value);
        return false;
    }
    if (value.length !== 2) {
        result.addError(path, 'Position must have exactly 2 values [x, y]', value);
        return false;
    }
    if (typeof value[0] !== 'number' || typeof value[1] !== 'number') {
        result.addError(path, 'Position values must be numbers', value);
        return false;
    }
    return true;
}

/**
 * Validate a size value (can be number or [width, height])
 */
function validateSize(value, path, result) {
    if (typeof value === 'number') return true;
    if (Array.isArray(value) && value.length === 2) {
        if (typeof value[0] === 'number' && typeof value[1] === 'number') {
            return true;
        }
    }
    result.addError(path, 'Size must be a number or array [width, height]', value);
    return false;
}

/**
 * Validate a color value
 */
function validateColor(value, path, result) {
    if (typeof value !== 'string') {
        result.addError(path, 'Color must be a string', value);
        return false;
    }
    // Basic hex color validation
    if (!value.match(/^#[0-9A-Fa-f]{3,8}$/)) {
        result.addWarning(path, 'Color should be a valid hex color (e.g., #6366f1)', value);
    }
    return true;
}

/**
 * Validate a component definition
 * @param {Object} component - Component to validate
 * @param {number} index - Index in components array
 * @param {ValidationResult} result - Validation result object
 * @param {boolean} hasAutoLayout - Whether auto-layout is enabled
 */
function validateComponent(component, index, result, hasAutoLayout = false) {
    const path = `components[${index}]`;

    // Required: id
    if (!component.id) {
        result.addError(`${path}.id`, 'Component must have an id');
    } else if (typeof component.id !== 'string') {
        result.addError(`${path}.id`, 'Component id must be a string', component.id);
    }

    // Required: type
    if (!component.type) {
        result.addError(`${path}.type`, 'Component must have a type');
    } else if (!VALID_COMPONENT_TYPES.includes(component.type)) {
        result.addError(
            `${path}.type`,
            `Invalid component type. Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`,
            component.type
        );
    }

    // v2.9: Position is optional when auto-layout is enabled
    if (!component.position) {
        if (!hasAutoLayout) {
            result.addError(`${path}.position`, 'Component must have a position (or enable layout.mode: "auto")');
        }
        // Position will be auto-calculated by layout engine
    } else {
        validatePosition(component.position, `${path}.position`, result);
    }

    // Optional: color (auto-assigned by layout if not provided)
    if (component.color) {
        validateColor(component.color, `${path}.color`, result);
    }

    // Optional: size (auto-assigned by layout if not provided)
    if (component.size) {
        validateSize(component.size, `${path}.size`, result);
    }

}

/**
 * Validate a zone definition
 */
function validateZone(zone, index, result) {
    const path = `zones[${index}]`;

    if (!zone.id) {
        result.addError(`${path}.id`, 'Zone must have an id');
    }

    if (!zone.position) {
        result.addError(`${path}.position`, 'Zone must have a position');
    } else {
        validatePosition(zone.position, `${path}.position`, result);
    }

    if (!zone.size) {
        result.addError(`${path}.size`, 'Zone must have a size [width, height]');
    } else {
        validateSize(zone.size, `${path}.size`, result);
    }

    if (zone.color) {
        validateColor(zone.color, `${path}.color`, result);
    }
}

/**
 * Validate layout settings
 */
function validateLayout(layout, result) {
    if (!layout || typeof layout !== 'object') return;

    if (layout.mode && layout.mode !== 'auto') {
        result.addWarning('layout.mode', 'layout.mode should be "auto" to enable auto-layout', layout.mode);
    }

    if (layout.profile && !VALID_LAYOUT_PROFILES.includes(layout.profile)) {
        result.addWarning(
            'layout.profile',
            `Invalid layout profile. Valid profiles: ${VALID_LAYOUT_PROFILES.join(', ')}`,
            layout.profile
        );
    }

    if (layout.template && !VALID_LAYOUT_PROFILES.includes(layout.template)) {
        result.addWarning(
            'layout.template',
            `Invalid layout template. Valid templates: ${VALID_LAYOUT_PROFILES.join(', ')}`,
            layout.template
        );
    }

    if (layout.direction && !VALID_LAYOUT_DIRECTIONS.includes(layout.direction)) {
        result.addWarning(
            'layout.direction',
            `Invalid layout direction. Valid directions: ${VALID_LAYOUT_DIRECTIONS.join(', ')}`,
            layout.direction
        );
    }

    if (layout.hints) {
        if (layout.hints.primaryPath && !Array.isArray(layout.hints.primaryPath)) {
            result.addWarning('layout.hints.primaryPath', 'primaryPath should be an array of component ids');
        }
        if (layout.hints.grouping && !VALID_LAYOUT_GROUPING.includes(layout.hints.grouping)) {
            result.addWarning(
                'layout.hints.grouping',
                `Invalid grouping. Valid options: ${VALID_LAYOUT_GROUPING.join(', ')}`,
                layout.hints.grouping
            );
        }
        if (layout.hints.compact !== undefined && typeof layout.hints.compact !== 'boolean') {
            result.addWarning('layout.hints.compact', 'compact should be a boolean');
        }
    }
}

/**
 * Validate a connection definition
 */
function validateConnection(connection, index, componentIds, result) {
    const path = `connections[${index}]`;

    if (!connection.id) {
        result.addError(`${path}.id`, 'Connection must have an id');
    }

    if (!connection.from) {
        result.addError(`${path}.from`, 'Connection must have a "from" property');
    } else if (typeof connection.from === 'string') {
        // ID reference - validate it exists
        if (!componentIds.has(connection.from)) {
            result.addError(
                `${path}.from`,
                `Referenced component "${connection.from}" does not exist`,
                connection.from
            );
        }
    } else if (typeof connection.from === 'object') {
        validatePosition(connection.from, `${path}.from`, result);
    }

    if (!connection.to) {
        result.addError(`${path}.to`, 'Connection must have a "to" property');
    } else if (typeof connection.to === 'string') {
        if (!componentIds.has(connection.to)) {
            result.addError(
                `${path}.to`,
                `Referenced component "${connection.to}" does not exist`,
                connection.to
            );
        }
    } else if (typeof connection.to === 'object') {
        validatePosition(connection.to, `${path}.to`, result);
    }

    if (connection.type && !VALID_CONNECTION_TYPES.includes(connection.type)) {
        result.addError(
            `${path}.type`,
            `Invalid connection type. Valid types: ${VALID_CONNECTION_TYPES.join(', ')}`,
            connection.type
        );
    }

    if (connection.color) {
        validateColor(connection.color, `${path}.color`, result);
    }
}

/**
 * Validate an animation action
 */
function validateAnimationAction(action, stepIndex, actionIndex, allIds, result) {
    const path = `steps[${stepIndex}].animate[${actionIndex}]`;

    // Handle shorthand syntax: { fadeIn: 'component-id' }
    const actionKeys = Object.keys(action);
    const animationType = actionKeys.find(key => VALID_ANIMATION_TYPES.includes(key));

    if (animationType) {
        const target = action[animationType];

        // Validate target(s) exist
        if (typeof target === 'string') {
            if (!allIds.has(target)) {
                result.addWarning(
                    `${path}.${animationType}`,
                    `Target "${target}" not found in components, zones, or connections`,
                    target
                );
            }
        } else if (Array.isArray(target)) {
            target.forEach((t, i) => {
                if (!allIds.has(t)) {
                    result.addWarning(
                        `${path}.${animationType}[${i}]`,
                        `Target "${t}" not found`,
                        t
                    );
                }
            });
        }
    } else if (action.type) {
        // Full syntax: { type: 'fadeIn', target: 'id' }
        if (!VALID_ANIMATION_TYPES.includes(action.type)) {
            result.addError(
                `${path}.type`,
                `Invalid animation type. Valid types: ${VALID_ANIMATION_TYPES.join(', ')}`,
                action.type
            );
        }

        if (action.target && typeof action.target === 'string') {
            if (!allIds.has(action.target)) {
                result.addWarning(
                    `${path}.target`,
                    `Target "${action.target}" not found`,
                    action.target
                );
            }
        }
    }
}

/**
 * Validate a step definition
 */
function validateStep(step, index, allIds, result) {
    const path = `steps[${index}]`;

    if (!step.title) {
        result.addError(`${path}.title`, 'Step must have a title');
    }

    // Description is optional but recommended
    if (!step.description) {
        result.addWarning(`${path}.description`, 'Step should have a description');
    }

    // Validate animations (can be 'animate' or 'actions')
    const animations = step.animate || step.actions;
    if (!animations) {
        result.addWarning(`${path}`, 'Step has no animations');
    } else if (!Array.isArray(animations)) {
        result.addError(`${path}.animate`, 'Animations must be an array');
    } else {
        animations.forEach((action, i) => {
            validateAnimationAction(action, index, i, allIds, result);
        });
    }
}

// =====================================================
// Main Validator
// =====================================================

/**
 * Validate a complete scenario
 * @param {Object} scenario - Parsed scenario object
 * @returns {ValidationResult} Validation result with errors and warnings
 */
export function validateScenario(scenario) {
    logger.time('Schema validation');
    const result = new ValidationResult();

    // Validate basic structure
    if (!scenario || typeof scenario !== 'object') {
        result.addError('root', 'Scenario must be an object');
        return result;
    }

    // Required: name
    if (!scenario.name) {
        result.addError('name', 'Scenario must have a name');
    }

    // Optional but recommended
    if (!scenario.description) {
        result.addWarning('description', 'Scenario should have a description');
    }

    // Collect all IDs for reference validation
    const componentIds = new Set();
    const connectionIds = new Set();
    const zoneIds = new Set();
    const allIds = new Set();

    // v2.9: Check if auto-layout is enabled
    const hasAutoLayout = scenario.layout?.mode === 'auto' ||
        scenario.components?.some(c => !c.position);

    // Validate layout settings
    if (scenario.layout) {
        validateLayout(scenario.layout, result);
    }

    // Validate zones
    if (scenario.zones && Array.isArray(scenario.zones)) {
        scenario.zones.forEach((zone, i) => {
            if (!hasAutoLayout) {
                validateZone(zone, i, result);
            } else {
                if (zone.position) validatePosition(zone.position, `zones[${i}].position`, result);
                if (zone.size) validateSize(zone.size, `zones[${i}].size`, result);
                if (zone.color) validateColor(zone.color, `zones[${i}].color`, result);
            }
            if (zone.id) {
                zoneIds.add(zone.id);
                allIds.add(zone.id);
            }
        });
    }

    // Validate components
    if (!scenario.components || !Array.isArray(scenario.components)) {
        result.addError('components', 'Scenario must have a components array');
    } else {
        scenario.components.forEach((comp, i) => {
            validateComponent(comp, i, result, hasAutoLayout);
            if (comp.id) {
                if (componentIds.has(comp.id)) {
                    result.addError(`components[${i}].id`, `Duplicate component id: ${comp.id}`);
                }
                componentIds.add(comp.id);
                allIds.add(comp.id);
            }
        });
    }

    // Validate connections
    if (scenario.connections && Array.isArray(scenario.connections)) {
        scenario.connections.forEach((conn, i) => {
            validateConnection(conn, i, componentIds, result);
            if (conn.id) {
                if (connectionIds.has(conn.id)) {
                    result.addError(`connections[${i}].id`, `Duplicate connection id: ${conn.id}`);
                }
                connectionIds.add(conn.id);
                allIds.add(conn.id);
            }
        });
    }

    // Validate steps
    if (!scenario.steps || !Array.isArray(scenario.steps)) {
        result.addError('steps', 'Scenario must have a steps array');
    } else if (scenario.steps.length === 0) {
        result.addWarning('steps', 'Scenario has no animation steps');
    } else {
        scenario.steps.forEach((step, i) => {
            validateStep(step, i, allIds, result);
        });
    }

    const duration = logger.timeEnd('Schema validation');

    if (result.valid) {
        logger.info('Schema validation passed', {
            components: componentIds.size,
            connections: connectionIds.size,
            zones: zoneIds.size,
            steps: scenario.steps?.length || 0
        });
    } else {
        logger.error('Schema validation failed', result.toSummary());
    }

    return result;
}

/**
 * Get a user-friendly error message
 * @param {ValidationResult} result - Validation result
 * @returns {string} Formatted error message
 */
export function formatValidationErrors(result) {
    if (result.valid && result.warnings.length === 0) {
        return 'Validation passed!';
    }

    let message = '';

    if (result.errors.length > 0) {
        message += '❌ Errors:\n';
        result.errors.forEach(err => {
            message += `  • ${err.path}: ${err.message}\n`;
        });
    }

    if (result.warnings.length > 0) {
        message += '\n⚠️ Warnings:\n';
        result.warnings.forEach(warn => {
            message += `  • ${warn.path}: ${warn.message}\n`;
        });
    }

    return message;
}

export default { validateScenario, formatValidationErrors, ValidationResult };
