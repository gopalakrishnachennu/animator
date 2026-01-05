/**
 * Flow Animation Engine - YAML Parser
 * Parses YAML/JSON scenario files and transforms them to engine format
 * 
 * @module engine/yaml-parser
 * @version 1.0.0
 */

import yaml from 'js-yaml';
import { createLogger } from './logger.js';
import { validateScenario, formatValidationErrors, ValidationResult } from './schema-validator.js';
import { ConnectionResolver } from './connection-resolver.js';
import { calculateLayout, generateStepsFromFlow, needsAutoLayout } from './layout.js';
import { inferLayoutHints } from './scene-analyzer.js';

const logger = createLogger('YAMLParser');

// =====================================================
// Parse Error Class
// =====================================================

export class ParseError extends Error {
    constructor(message, line = null, column = null, originalError = null) {
        super(message);
        this.name = 'ParseError';
        this.line = line;
        this.column = column;
        this.originalError = originalError;
    }

    toUserMessage() {
        let msg = this.message;
        if (this.line !== null) {
            msg = `Line ${this.line}: ${msg}`;
        }
        return msg;
    }
}

// =====================================================
// YAML Custom Schema
// =====================================================

// Create custom types for better YAML parsing
const positionType = new yaml.Type('!pos', {
    kind: 'sequence',
    construct: (data) => ({ x: data[0], y: data[1] })
});

const customSchema = yaml.DEFAULT_SCHEMA;

// =====================================================
// Transform Functions
// =====================================================

/**
 * Transform position from array [x, y] to object {x, y}
 */
function transformPosition(position) {
    if (Array.isArray(position)) {
        return { x: position[0], y: position[1] };
    }
    return position;
}

/**
 * Transform size from array [w, h] or number to proper format
 */
function transformSize(size, type) {
    if (Array.isArray(size)) {
        return { width: size[0], height: size[1] };
    }
    if (typeof size === 'number') {
        // For hexagon, diamond, gear - keep as 'size'
        const sizeTypes = ['hexagon', 'diamond', 'gear'];
        if (sizeTypes.includes(type)) {
            return { size };
        }
        // For others, treat as uniform size
        return { width: size, height: size };
    }
    return size;
}

/**
 * Transform a component from YAML format to engine format
 */
function transformComponent(comp) {
    const transformed = { ...comp };

    // Transform position
    if (comp.position) {
        const pos = transformPosition(comp.position);
        transformed.x = pos.x;
        transformed.y = pos.y;
        delete transformed.position;
    }

    // Transform size
    if (comp.size) {
        const sizeProps = transformSize(comp.size, comp.type);
        Object.assign(transformed, sizeProps);
        if (sizeProps.size === undefined) {
            delete transformed.size;
        }
    }

    return transformed;
}

/**
 * Transform a zone from YAML format to engine format
 */
function transformZone(zone) {
    const transformed = { ...zone };

    // Transform position
    if (zone.position) {
        const pos = transformPosition(zone.position);
        transformed.x = pos.x;
        transformed.y = pos.y;
        delete transformed.position;
    }

    // Transform size
    if (Array.isArray(zone.size)) {
        transformed.width = zone.size[0];
        transformed.height = zone.size[1];
        delete transformed.size;
    }

    return transformed;
}

/**
 * Transform animation action from shorthand to full format
 * Shorthand: { fadeIn: 'component-id', delay: 0.3 }
 * Full: { type: 'fadeIn', target: 'component-id', delay: 0.3 }
 */
function transformAnimationAction(action) {
    // List of valid animation types
    const animationTypes = [
        'fadeIn', 'fadeOut', 'appear', 'moveTo', 'scale', 'pulse',
        'highlight', 'unhighlight', 'drawLine', 'wait', 'color',
        'callout'
    ];

    // Check if using shorthand syntax
    for (const type of animationTypes) {
        if (action[type] !== undefined) {
            const target = action[type];
            const transformed = {
                type,
                target: Array.isArray(target) ? target[0] : target, // Take first if array
                ...action
            };
            delete transformed[type];

            // If target was array, we need to expand to multiple actions
            if (Array.isArray(target) && target.length > 1) {
                return target.map((t, i) => ({
                    type,
                    target: t,
                    delay: (action.delay || 0) + (i * 0.1),
                    duration: action.duration,
                    color: action.color,
                    to: action.to
                })).filter(a => a.target);
            }

            return transformed;
        }
    }

    // Already in full format
    return action;
}

/**
 * Transform a step from YAML format to engine format
 */
function transformStep(step) {
    const transformed = { ...step };

    // Get animations (can be 'animate' or 'actions')
    const animations = step.animate || step.actions || [];

    // Transform each action
    const transformedActions = [];
    animations.forEach(action => {
        const result = transformAnimationAction(action);
        if (Array.isArray(result)) {
            transformedActions.push(...result);
        } else {
            transformedActions.push(result);
        }
    });

    transformed.actions = transformedActions;
    delete transformed.animate;

    return transformed;
}

// =====================================================
// Main Parser Class
// =====================================================

export class YAMLParser {
    constructor(options = {}) {
        this.options = {
            validateSchema: true,
            resolveConnections: true,
            strictMode: false,
            ...options
        };

        this.connectionResolver = new ConnectionResolver();
    }

    /**
     * Parse YAML string to scenario object
     * @param {string} input - YAML or JSON string
     * @returns {Object} Parsed and transformed scenario
     * @throws {ParseError} If parsing fails
     */
    parse(input) {
        logger.time('YAML parsing');
        logger.info('Starting YAML parse');

        if (!input || typeof input !== 'string') {
            throw new ParseError('Input must be a non-empty string');
        }

        // Trim and detect format
        input = input.trim();
        let parsed;

        try {
            // Try YAML first (which also handles JSON)
            parsed = yaml.load(input, {
                schema: customSchema,
                json: true,
                onWarning: (warning) => {
                    logger.warn('YAML warning', warning);
                }
            });
        } catch (error) {
            logger.error('YAML parse error', error);

            // Extract line number from YAML error
            const lineMatch = error.message.match(/line (\d+)/i);
            const line = lineMatch ? parseInt(lineMatch[1]) : null;

            throw new ParseError(
                `Invalid YAML: ${error.reason || error.message}`,
                line,
                null,
                error
            );
        }

        if (!parsed) {
            throw new ParseError('Empty or invalid YAML input');
        }

        logger.debug('Raw parsed YAML', parsed);

        // Validate schema
        if (this.options.validateSchema) {
            if (Array.isArray(parsed.scenes)) {
                parsed.scenes.forEach((scene, index) => {
                    const validation = validateScenario(scene);
                    if (!validation.valid && this.options.strictMode) {
                        throw new ParseError(
                            `Scene ${index + 1} validation failed:\n${formatValidationErrors(validation)}`
                        );
                    }
                    if (validation.warnings.length > 0) {
                        logger.warn('Scene validation warnings', { index, warnings: validation.warnings });
                    }
                });
            } else {
                const validation = validateScenario(parsed);
                if (!validation.valid && this.options.strictMode) {
                    throw new ParseError(
                        `Schema validation failed:\n${formatValidationErrors(validation)}`
                    );
                }
                if (validation.warnings.length > 0) {
                    logger.warn('Schema validation warnings', validation.warnings);
                }
            }
        }

        // Multi-scene support
        if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
            const baseDefaults = {
                name: parsed.name,
                description: parsed.description,
                category: parsed.category,
                layout: parsed.layout
            };

            const transformedScenes = parsed.scenes.map(scene => {
                let merged = {
                    ...baseDefaults,
                    ...scene,
                    layout: {
                        ...(baseDefaults.layout || {}),
                        ...(scene.layout || {}),
                        hints: {
                            ...(baseDefaults.layout?.hints || {}),
                            ...(scene.layout?.hints || {})
                        }
                    }
                };

                // v3.1: Only infer layout when mode is explicitly 'auto'
                const sceneMode = merged.layout?.mode || 'manual';
                if (sceneMode === 'auto' && (!merged.layout?.profile || !merged.layout?.hints)) {
                    const inferred = inferLayoutHints(merged);
                    merged.layout = {
                        mode: 'auto',
                        profile: merged.layout?.profile || inferred.profile,
                        template: merged.layout?.template || inferred.template,
                        direction: merged.layout?.direction || 'LR',
                        hints: {
                            ...inferred.hints,
                            ...(merged.layout?.hints || {})
                        }
                    };
                    if (inferred.components) {
                        merged.components = inferred.components;
                    }
                }

                if (needsAutoLayout(merged)) {
                    merged = calculateLayout(merged, merged.layout);
                }

                if (merged.flow && (!merged.steps || merged.steps.length === 0)) {
                    merged = generateStepsFromFlow(merged);
                }

                return this.transform(merged);
            });

            return {
                id: parsed.id || this.generateId(parsed.name),
                name: parsed.name,
                description: parsed.description || '',
                category: parsed.category || 'Custom',
                scenes: transformedScenes
            };
        }

        // v3.1: Layout inference ONLY runs when mode is explicitly 'auto'
        // Manual mode (default) uses x/y coordinates from YAML directly
        const layoutMode = parsed.layout?.mode || 'manual';  // Default to MANUAL

        if (layoutMode === 'auto' && (!parsed.layout?.profile || !parsed.layout?.hints)) {
            const inferred = inferLayoutHints(parsed);
            parsed.layout = {
                mode: 'auto',
                profile: parsed.layout?.profile || inferred.profile,
                template: parsed.layout?.template || inferred.template,
                direction: parsed.layout?.direction || 'LR',
                hints: {
                    ...inferred.hints,
                    ...(parsed.layout?.hints || {})
                }
            };
            if (inferred.components) {
                parsed.components = inferred.components;
            }
        }

        // v2.9: Apply auto-layout if needed
        let layoutApplied = false;
        if (needsAutoLayout(parsed)) {
            logger.info('Applying auto-layout');
            parsed = calculateLayout(parsed, parsed.layout);
            layoutApplied = true;
        }

        // v2.9: Generate steps from flow if not provided
        if (parsed.flow && (!parsed.steps || parsed.steps.length === 0)) {
            logger.info('Generating steps from flow');
            parsed = generateStepsFromFlow(parsed);
        }

        // Transform to engine format
        const transformed = this.transform(parsed);

        // Add layout metadata
        if (layoutApplied) {
            transformed._layoutApplied = true;
        }

        logger.timeEnd('YAML parsing');
        logger.info('YAML parse complete', {
            name: transformed.name,
            components: transformed.components?.length,
            connections: transformed.connections?.length,
            steps: transformed.steps?.length
        });

        return transformed;
    }

    /**
     * Transform parsed YAML to engine format
     * @param {Object} scenario - Parsed scenario object
     * @returns {Object} Transformed scenario
     */
    transform(scenario) {
        logger.debug('Transforming scenario');

        const transformed = {
            id: scenario.id || this.generateId(scenario.name),
            name: scenario.name,
            description: scenario.description || '',
            category: scenario.category || 'Custom'
        };

        // Transform zones
        if (scenario.zones) {
            transformed.zones = scenario.zones.map(transformZone);
            logger.debug(`Transformed ${transformed.zones.length} zones`);
        }

        // Transform components
        if (scenario.components) {
            transformed.components = scenario.components.map(transformComponent);
            logger.debug(`Transformed ${transformed.components.length} components`);
        }

        // Resolve and transform connections
        if (scenario.connections) {
            // First transform basic properties
            let connections = scenario.connections.map(conn => ({
                ...conn,
                type: conn.type || 'arrow'
            }));

            // Resolve ID-based connections to coordinates
            if (this.options.resolveConnections) {
                this.connectionResolver.registerComponents(transformed.components);
                this.connectionResolver.registerZones(transformed.zones);
                connections = connections.map(conn =>
                    this.connectionResolver.resolveConnection(conn)
                );
            }

            transformed.connections = connections;
            logger.debug(`Transformed ${transformed.connections.length} connections`);
        }

        // Transform steps
        if (scenario.steps) {
            transformed.steps = scenario.steps.map(transformStep);
            logger.debug(`Transformed ${transformed.steps.length} steps`);
        }

        // v2.10: Preserve layout metadata (stage dimensions for scrolling)
        if (scenario._stageWidth) {
            transformed._stageWidth = scenario._stageWidth;
        }
        if (scenario._stageHeight) {
            transformed._stageHeight = scenario._stageHeight;
        }
        if (scenario._layoutApplied) {
            transformed._layoutApplied = scenario._layoutApplied;
        }

        return transformed;
    }

    /**
     * Generate an ID from a name
     * @param {string} name - Scenario name
     * @returns {string} Generated ID
     */
    generateId(name) {
        if (!name) return `scenario-${Date.now()}`;
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Parse a file (File object or URL)
     * @param {File|string} source - File object or URL
     * @returns {Promise<Object>} Parsed scenario
     */
    async parseFile(source) {
        let content;

        if (source instanceof File) {
            logger.info(`Parsing file: ${source.name}`);
            content = await source.text();
        } else if (typeof source === 'string' && source.startsWith('http')) {
            logger.info(`Fetching from URL: ${source}`);
            const response = await fetch(source);
            if (!response.ok) {
                throw new ParseError(`Failed to fetch: ${response.statusText}`);
            }
            content = await response.text();
        } else {
            throw new ParseError('Invalid source: must be a File object or URL');
        }

        return this.parse(content);
    }

    /**
     * Validate YAML without parsing
     * @param {string} input - YAML string
     * @returns {Object} Validation result
     */
    validate(input) {
        try {
            const parsed = yaml.load(input);
            if (Array.isArray(parsed?.scenes)) {
                const combined = new ValidationResult();
                parsed.scenes.forEach(scene => combined.merge(validateScenario(scene)));
                return combined;
            }
            return validateScenario(parsed);
        } catch (error) {
            return {
                valid: false,
                errors: [{ path: 'yaml', message: error.message }],
                warnings: []
            };
        }
    }
}

// =====================================================
// Factory Functions
// =====================================================

/**
 * Create a new YAML parser instance
 * @param {Object} options - Parser options
 * @returns {YAMLParser}
 */
export function createYAMLParser(options) {
    return new YAMLParser(options);
}

/**
 * Quick parse function for simple use cases
 * @param {string} input - YAML string
 * @returns {Object} Parsed scenario
 */
export function parseYAML(input) {
    const parser = new YAMLParser();
    return parser.parse(input);
}

export default YAMLParser;
