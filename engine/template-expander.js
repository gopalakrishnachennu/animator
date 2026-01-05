/**
 * Flow Animation Engine - Template Expander
 * Stage 2: Deterministic component expansion from scene outlines
 * 
 * Auto-fills components, connections, and animations from templates.
 * Applies corporate spacing and L-shaped routing rules.
 * 
 * @module engine/template-expander
 * @version 1.0.0
 */

import { createLogger } from './logger.js';
import { LAYOUT_TEMPLATES, resolveTemplate } from './layout-templates.js';

const logger = createLogger('TemplateExpander');

// =====================================================
// Component Templates
// =====================================================

export const COMPONENT_TEMPLATES = {
    // Kubernetes Components
    pod: { type: 'rectangle', width: 100, height: 60, color: '#326CE5', icon: 'pod' },
    service: { type: 'hexagon', size: 50, color: '#326CE5', icon: 'service' },
    deployment: { type: 'rectangle', width: 120, height: 70, color: '#326CE5', icon: 'deployment' },
    ingress: { type: 'diamond', size: 60, color: '#326CE5', icon: 'ingress' },
    configmap: { type: 'rectangle', width: 80, height: 50, color: '#7B68EE', icon: 'configmap' },
    secret: { type: 'rectangle', width: 80, height: 50, color: '#8B0000', icon: 'secret' },
    pvc: { type: 'cylinder', width: 70, height: 80, color: '#4169E1', icon: 'pvc' },
    node: { type: 'rectangle', width: 140, height: 100, color: '#2F4F4F', icon: 'node' },
    namespace: { type: 'rectangle', width: 200, height: 150, color: 'transparent', borderColor: '#326CE5' },

    // Docker Components
    container: { type: 'rectangle', width: 100, height: 60, color: '#2496ED', icon: 'container' },
    image: { type: 'rectangle', width: 80, height: 50, color: '#2496ED', icon: 'image' },
    registry: { type: 'cylinder', width: 80, height: 90, color: '#2496ED', icon: 'registry' },
    volume: { type: 'cylinder', width: 60, height: 70, color: '#4682B4', icon: 'volume' },

    // AWS Components
    ec2: { type: 'rectangle', width: 100, height: 70, color: '#FF9900', icon: 'ec2' },
    lambda: { type: 'hexagon', size: 60, color: '#FF9900', icon: 'lambda' },
    s3: { type: 'cylinder', width: 80, height: 90, color: '#569A31', icon: 's3' },
    rds: { type: 'cylinder', width: 90, height: 100, color: '#3B48CC', icon: 'rds' },
    dynamodb: { type: 'cylinder', width: 80, height: 90, color: '#4053D6', icon: 'dynamodb' },
    sqs: { type: 'rectangle', width: 90, height: 60, color: '#FF4F8B', icon: 'sqs' },
    sns: { type: 'rectangle', width: 90, height: 60, color: '#FF4F8B', icon: 'sns' },
    elb: { type: 'circle', size: 60, color: '#8C4FFF', icon: 'elb' },
    cloudfront: { type: 'hexagon', size: 60, color: '#8C4FFF', icon: 'cloudfront' },

    // Generic Components
    server: { type: 'server', size: 1, color: '#4A5568' },
    database: { type: 'database', size: 1, color: '#3182CE' },
    user: { type: 'user', size: 1, color: '#48BB78' },
    client: { type: 'circle', size: 50, color: '#48BB78', icon: 'user' },
    api: { type: 'hexagon', size: 55, color: '#805AD5', icon: 'api' },
    gateway: { type: 'diamond', size: 60, color: '#D69E2E', icon: 'gateway' },
    loadbalancer: { type: 'circle', size: 60, color: '#38B2AC', icon: 'lb' },
    cache: { type: 'hexagon', size: 50, color: '#E53E3E', icon: 'cache' },
    queue: { type: 'rectangle', width: 100, height: 50, color: '#DD6B20', icon: 'queue' },
    firewall: { type: 'rectangle', width: 20, height: 100, color: '#C53030', icon: 'firewall' },

    // Messaging
    kafka: { type: 'hexagon', size: 60, color: '#231F20', icon: 'kafka' },
    rabbitmq: { type: 'hexagon', size: 55, color: '#FF6600', icon: 'rabbitmq' },

    // CI/CD
    github: { type: 'circle', size: 55, color: '#24292E', icon: 'github' },
    jenkins: { type: 'circle', size: 55, color: '#D33833', icon: 'jenkins' },
    argocd: { type: 'hexagon', size: 55, color: '#EF7B4D', icon: 'argocd' }
};

// =====================================================
// Zone Layout Templates
// =====================================================

const ZONE_TEMPLATES = {
    left: { x: 60, width: 250 },
    center: { x: 340, width: 300 },
    right: { x: 680, width: 250 }
};

// =====================================================
// Corporate Spacing Constants
// =====================================================

const SPACING = {
    zoneGap: 30,
    componentGap: 28,
    zoneMarginTop: 80,
    zoneMarginBottom: 40,
    zonePaddingX: 30,
    zonePaddingY: 40,
    componentRowGap: 90,
    componentColGap: 120
};

// =====================================================
// Rich Animation Actions Library
// =====================================================

const ANIMATION_ACTIONS = {
    reveal: ['fadeIn', 'slideIn', 'zoomIn', 'expandIn', 'dropIn'],
    connection: ['drawLine', 'animatePath', 'flowLine', 'dashDraw'],
    emphasis: ['pulse', 'highlight', 'glow', 'shake', 'bounce'],
    data: ['dataFlow', 'packetSend', 'streamData', 'batchTransfer'],
    transform: ['morph', 'colorShift', 'resize', 'rotate'],
    status: ['success', 'error', 'warning', 'loading', 'complete']
};

// Step title templates by phase
const STEP_TITLES = {
    init: ['Initializing System', 'Bootstrapping Services', 'Warming Up', 'Starting Engines'],
    reveal: ['Deploying Components', 'Spinning Up Instances', 'Launching Services', 'Activating Nodes'],
    connect: ['Establishing Links', 'Wiring Connections', 'Creating Pathways', 'Building Network'],
    flow: ['Data In Motion', 'Request Processing', 'Message Routing', 'Signal Propagation'],
    process: ['Computing Results', 'Transforming Data', 'Executing Logic', 'Processing Payload'],
    store: ['Persisting Data', 'Caching Results', 'Writing to Storage', 'Indexing Records'],
    complete: ['Operation Complete', 'Flow Finished', 'Transaction Done', 'Cycle Complete']
};

// =====================================================
// Template Expander Class
// =====================================================

export class TemplateExpander {
    constructor() {
        this.componentCounter = 0;
        this.connectionCounter = 0;
    }

    /**
     * Expand scene outline into full scenario structure
     * @param {Array} outline - Array of scene outlines from ScenePlanner
     * @param {string} scenarioName - Name for the scenario
     * @returns {Object} Complete scenario with components, connections, steps
     */
    expand(outline, scenarioName = 'Generated Scenario') {
        logger.info('Expanding outline', { scenes: outline.length });

        this.componentCounter = 0;
        this.connectionCounter = 0;

        const scenario = {
            name: scenarioName,
            description: `Generated scenario with ${outline.length} scenes`,
            category: 'Generated',
            scenes: outline.map((sceneOutline, index) =>
                this.expandScene(sceneOutline, index)
            )
        };

        logger.info('Expansion complete', {
            scenes: scenario.scenes.length,
            totalComponents: this.componentCounter,
            totalConnections: this.connectionCounter
        });

        return scenario;
    }

    /**
     * Expand a single scene outline into full scene structure
     */
    expandScene(outline, sceneIndex) {
        const layoutTemplate = resolveTemplate({ profile: outline.layoutProfile });

        // Build zones with proper positioning
        const zones = this.buildZones(outline.zones, sceneIndex);

        // Generate components based on hints and zones
        const components = this.generateComponents(
            outline.componentHints,
            outline.primaryPath,
            zones,
            sceneIndex
        );

        // Generate connections based on primary path
        const connections = this.generateConnections(components, outline.layoutProfile);

        // Generate animation steps
        const steps = this.generateSteps(components, connections, outline);

        return {
            name: outline.title,
            description: outline.goal,
            layout: {
                profile: outline.layoutProfile,
                direction: outline.layoutProfile === 'tiered' ? 'TB' : 'LR',
                ...layoutTemplate
            },
            zones,
            components,
            connections,
            steps
        };
    }

    /**
     * Build zone definitions with proper positioning
     */
    buildZones(zoneOutlines, sceneIndex) {
        const zones = [];
        const yStart = SPACING.zoneMarginTop;

        zoneOutlines.forEach((zone, i) => {
            const template = ZONE_TEMPLATES[zone.position] || ZONE_TEMPLATES.center;

            zones.push({
                id: `${zone.id}-s${sceneIndex}`,
                label: zone.label,
                x: template.x,
                y: yStart,
                width: template.width,
                height: 350,
                color: this.getZoneColor(zone.position, i)
            });
        });

        return zones;
    }

    /**
     * Get zone color based on position
     */
    getZoneColor(position, index) {
        const colors = {
            left: 'rgba(72, 187, 120, 0.1)',    // Green tint
            center: 'rgba(99, 102, 241, 0.1)',  // Purple tint
            right: 'rgba(237, 137, 54, 0.1)'    // Orange tint
        };
        return colors[position] || 'rgba(203, 213, 224, 0.1)';
    }

    /**
     * Generate components from hints
     */
    generateComponents(hints, primaryPath, zones, sceneIndex) {
        const components = [];
        const usedTypes = new Set();

        // Merge hints and primaryPath, prioritize primaryPath
        const allHints = [...new Set([...primaryPath, ...hints])].slice(0, 8);

        // Distribute components across zones
        zones.forEach((zone, zoneIndex) => {
            const zoneHints = this.getHintsForZone(allHints, zoneIndex, zones.length);

            zoneHints.forEach((hint, compIndex) => {
                const template = this.getComponentTemplate(hint);
                const position = this.calculateComponentPosition(zone, compIndex, zoneHints.length);

                const comp = {
                    id: `comp-${sceneIndex}-${this.componentCounter++}`,
                    type: template.type,
                    label: this.generateLabel(hint, usedTypes),
                    zone: zone.id,
                    ...position,
                    ...this.getComponentDimensions(template)
                };

                if (template.color) comp.color = template.color;
                if (template.icon) comp.icon = template.icon;

                components.push(comp);
                usedTypes.add(hint);
            });
        });

        return components;
    }

    /**
     * Get hints for a specific zone based on position
     */
    getHintsForZone(hints, zoneIndex, totalZones) {
        const hintsPerZone = Math.ceil(hints.length / totalZones);
        const start = zoneIndex * hintsPerZone;
        return hints.slice(start, start + hintsPerZone).slice(0, 3); // Max 3 per zone
    }

    /**
     * Get component template, with fallback
     */
    getComponentTemplate(hint) {
        const normalized = hint.toLowerCase().replace(/[^a-z0-9]/g, '');
        return COMPONENT_TEMPLATES[normalized] || COMPONENT_TEMPLATES.server;
    }

    /**
     * Calculate component position within zone
     */
    calculateComponentPosition(zone, index, total) {
        const cols = Math.min(total, 2);
        const rows = Math.ceil(total / cols);

        const col = index % cols;
        const row = Math.floor(index / cols);

        const startX = zone.x + SPACING.zonePaddingX;
        const startY = zone.y + SPACING.zonePaddingY + 40; // Leave room for zone label

        return {
            x: startX + col * SPACING.componentColGap,
            y: startY + row * SPACING.componentRowGap
        };
    }

    /**
     * Get component dimensions from template
     */
    getComponentDimensions(template) {
        if (template.width && template.height) {
            return { width: template.width, height: template.height };
        }
        if (template.size) {
            return { size: template.size };
        }
        return { size: 50 };
    }

    /**
     * Generate human-readable label
     */
    generateLabel(hint, usedTypes) {
        const base = hint.charAt(0).toUpperCase() + hint.slice(1);
        if (usedTypes.has(hint)) {
            return `${base} ${usedTypes.size}`;
        }
        return base;
    }

    /**
     * Generate connections based on layout profile - NOW WITH VARIETY
     */
    generateConnections(components, layoutProfile) {
        const connections = [];

        if (components.length < 2) return connections;

        // Connection style library
        const styles = ['solid', 'dashed', 'dotted'];
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
        let styleIndex = 0;

        const getNextStyle = () => {
            const style = {
                style: styles[styleIndex % styles.length],
                color: colors[styleIndex % colors.length]
            };
            styleIndex++;
            return style;
        };

        switch (layoutProfile) {
            case 'hub':
                // Central hub pattern - hub component connects to all others
                const hubIndex = Math.min(1, components.length - 1);
                const hub = components[hubIndex];
                components.forEach((comp, i) => {
                    if (i !== hubIndex) {
                        const isIncoming = i < hubIndex;
                        connections.push(this.createConnection(
                            isIncoming ? comp : hub,
                            isIncoming ? hub : comp,
                            { ...getNextStyle(), bidirectional: false }
                        ));
                    }
                });
                break;

            case 'fanout':
                // Source fans out to multiple targets with varied timing
                const source = components[0];
                components.slice(1).forEach((comp, i) => {
                    connections.push(this.createConnection(source, comp, {
                        ...getNextStyle(),
                        delay: i * 100,
                        animated: true
                    }));
                });
                break;

            case 'swimlane':
                // Parallel lanes with cross-connections
                const lanes = Math.min(3, Math.ceil(components.length / 2));
                for (let lane = 0; lane < lanes; lane++) {
                    const laneStart = lane * 2;
                    const laneEnd = Math.min(laneStart + 2, components.length);
                    for (let i = laneStart; i < laneEnd - 1; i++) {
                        connections.push(this.createConnection(
                            components[i],
                            components[i + 1],
                            getNextStyle()
                        ));
                    }
                }
                // Cross-lane connections
                if (components.length >= 4) {
                    connections.push(this.createConnection(
                        components[1],
                        components[2],
                        { style: 'dashed', color: '#9CA3AF', routing: 'orthogonal' }
                    ));
                }
                break;

            case 'tiered':
                // Layered connections with some skip-connections
                for (let i = 0; i < components.length - 1; i++) {
                    connections.push(this.createConnection(
                        components[i],
                        components[i + 1],
                        getNextStyle()
                    ));
                }
                // Add skip connection for complex flows
                if (components.length >= 4) {
                    connections.push(this.createConnection(
                        components[0],
                        components[components.length - 1],
                        { style: 'dotted', color: '#9CA3AF', label: 'bypass' }
                    ));
                }
                break;

            case 'mesh':
                // Partial mesh - each node connects to 2-3 others
                for (let i = 0; i < components.length; i++) {
                    const targets = [1, 2].map(offset => (i + offset) % components.length);
                    targets.forEach(t => {
                        if (t !== i) {
                            connections.push(this.createConnection(
                                components[i],
                                components[t],
                                getNextStyle()
                            ));
                        }
                    });
                }
                break;

            case 'pipeline':
            default:
                // Sequential with alternating styles for variety
                for (let i = 0; i < components.length - 1; i++) {
                    connections.push(this.createConnection(
                        components[i],
                        components[i + 1],
                        {
                            ...getNextStyle(),
                            animated: i === Math.floor(components.length / 2) // Animate middle connection
                        }
                    ));
                }
                break;
        }

        return connections;
    }

    /**
     * Create a single connection with L-shaped routing and styling
     */
    createConnection(from, to, options = {}) {
        const conn = {
            id: `conn-${this.connectionCounter++}`,
            from: from.id,
            to: to.id,
            style: options.style || 'solid',
            animated: options.animated || false
        };

        if (options.color) conn.color = options.color;
        if (options.label) conn.label = options.label;
        if (options.delay) conn.delay = options.delay;
        if (options.bidirectional) conn.bidirectional = true;

        // Apply L-shaped routing if components are in different zones
        if (from.zone !== to.zone) {
            conn.routing = options.routing || 'orthogonal';
        }

        return conn;
    }

    /**
     * Generate rich animation steps with variety
     */
    generateSteps(components, connections, outline) {
        const steps = [];
        const sceneContext = this.inferSceneContext(outline);

        // Helper to pick random from array
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        // Step 1: Contextual Introduction
        steps.push({
            title: this.generateContextualTitle(outline.title, 'intro'),
            description: outline.goal,
            actions: [
                { type: 'wait', duration: 400 },
                ...(components.slice(0, 2).map(c => ({ type: 'fadeIn', target: c.id, duration: 300 })))
            ]
        });

        // Step 2: Primary Components Reveal - Use varied animations
        if (components.length > 2) {
            const revealType = pick(ANIMATION_ACTIONS.reveal);
            steps.push({
                title: pick(STEP_TITLES.reveal),
                description: `Activating ${sceneContext} components`,
                actions: components.slice(2, 5).map((comp, i) => ({
                    type: revealType,
                    target: comp.id,
                    delay: i * 150,
                    duration: 400
                }))
            });
        }

        // Step 3: Remaining components with different animation
        if (components.length > 5) {
            const revealType = pick(ANIMATION_ACTIONS.reveal.filter(a => a !== 'fadeIn'));
            steps.push({
                title: `Scaling ${sceneContext}`,
                description: 'Expanding system capacity',
                actions: components.slice(5).map((comp, i) => ({
                    type: revealType,
                    target: comp.id,
                    delay: i * 100
                }))
            });
        }

        // Step 4: Connection establishment - varied by layout
        if (connections.length > 0) {
            const connChunks = this.chunkArray(connections, 3);
            connChunks.forEach((chunk, chunkIndex) => {
                const connType = pick(ANIMATION_ACTIONS.connection);
                steps.push({
                    title: chunkIndex === 0 ? pick(STEP_TITLES.connect) : `Linking Services (${chunkIndex + 1})`,
                    description: chunkIndex === 0 ? 'Establishing communication channels' : 'Completing network topology',
                    actions: chunk.map((conn, i) => ({
                        type: connType,
                        target: conn.id,
                        delay: i * 200,
                        duration: 500
                    }))
                });
            });
        }

        // Step 5: Data Flow Animation - use rich data actions
        if (connections.length > 0 && components.length > 2) {
            const dataAction = pick(ANIMATION_ACTIONS.data);
            const flowConnections = connections.slice(0, Math.min(4, connections.length));
            steps.push({
                title: pick(STEP_TITLES.flow),
                description: `${sceneContext} data flowing through the system`,
                actions: [
                    ...flowConnections.map((conn, i) => ({
                        type: dataAction,
                        from: conn.from,
                        to: conn.to,
                        delay: i * 300,
                        duration: 800,
                        particleCount: 3
                    })),
                    // Add emphasis on receiving components
                    { type: 'pulse', target: components[components.length - 1].id, delay: 1000 }
                ]
            });
        }

        // Step 6: Processing/Transform step
        if (components.length > 3) {
            const midComponent = components[Math.floor(components.length / 2)];
            steps.push({
                title: pick(STEP_TITLES.process),
                description: `${midComponent.label} processing requests`,
                actions: [
                    { type: 'highlight', target: midComponent.id, duration: 600 },
                    { type: pick(ANIMATION_ACTIONS.emphasis), target: midComponent.id, delay: 600 },
                    { type: 'glow', target: midComponent.id, delay: 1000, color: '#10B981' }
                ]
            });
        }

        // Step 7: Success/completion with status indication
        steps.push({
            title: pick(STEP_TITLES.complete),
            description: `${outline.title} demonstration complete`,
            actions: [
                { type: 'success', target: components[components.length - 1].id },
                ...components.slice(0, 3).map(c => ({ type: 'glow', target: c.id, color: '#10B981', delay: 200 })),
                { type: 'wait', duration: 500 }
            ]
        });

        // Ensure we have 8-12 steps by adding contextual fillers
        while (steps.length < 8) {
            const fillerStep = this.generateFillerStep(components, connections, steps.length);
            steps.splice(steps.length - 1, 0, fillerStep);
        }

        return steps.slice(0, 12);
    }

    /**
     * Generate contextual title based on scene and phase
     */
    generateContextualTitle(sceneTitle, phase) {
        const titles = {
            intro: [`Starting: ${sceneTitle}`, `Begin: ${sceneTitle}`, sceneTitle],
            middle: [`Processing: ${sceneTitle}`, `Executing: ${sceneTitle}`],
            end: [`Completing: ${sceneTitle}`, `Finishing: ${sceneTitle}`]
        };
        return titles[phase][Math.floor(Math.random() * titles[phase].length)];
    }

    /**
     * Infer context from outline for richer descriptions
     */
    inferSceneContext(outline) {
        const hints = (outline.componentHints || []).join(' ').toLowerCase();
        if (hints.includes('kafka') || hints.includes('queue') || hints.includes('sqs')) return 'message';
        if (hints.includes('database') || hints.includes('postgres') || hints.includes('redis')) return 'data';
        if (hints.includes('gateway') || hints.includes('ingress')) return 'request';
        if (hints.includes('user') || hints.includes('client')) return 'user';
        if (hints.includes('pod') || hints.includes('container')) return 'container';
        return 'system';
    }

    /**
     * Generate filler step for minimum step requirement
     */
    generateFillerStep(components, connections, stepNumber) {
        const fillerTypes = [
            {
                title: 'Health Check',
                description: 'Verifying component status',
                actions: components.slice(0, 2).map(c => ({ type: 'pulse', target: c.id }))
            },
            {
                title: 'Synchronizing State',
                description: 'Ensuring consistency across components',
                actions: connections.slice(0, 2).map(c => ({ type: 'flowLine', target: c.id }))
            },
            {
                title: 'Monitoring Active',
                description: 'Observability in action',
                actions: [{ type: 'highlight', target: components[0].id }, { type: 'wait', duration: 400 }]
            }
        ];
        return fillerTypes[stepNumber % fillerTypes.length];
    }

    /**
     * Split array into chunks
     */
    chunkArray(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }
}

// =====================================================
// Singleton Instance
// =====================================================

let expanderInstance = null;

export function getTemplateExpander() {
    if (!expanderInstance) {
        expanderInstance = new TemplateExpander();
    }
    return expanderInstance;
}

export default TemplateExpander;
