/**
 * Flow Animation Engine - Scene Planner
 * Stage 1: LLM-powered multi-scene outline generation
 * 
 * Converts a single sentence into a structured multi-scene outline
 * with layout hints, zones, and primary paths.
 * 
 * @module engine/scene-planner
 * @version 1.0.0
 */

import { createLogger } from './logger.js';

const logger = createLogger('ScenePlanner');

// =====================================================
// Scene Outline Schema
// =====================================================

/**
 * Scene Outline structure returned by planner:
 * {
 *   title: string,           // Scene title
 *   goal: string,            // What this scene demonstrates
 *   layoutProfile: string,   // pipeline | hub | fanout | tiered | swimlane
 *   zones: [
 *     { id: string, label: string, position: 'left' | 'center' | 'right', role: string }
 *   ],
 *   primaryPath: string[],   // Component type hints for main flow
 *   componentHints: string[] // Types of components needed
 * }
 */

// =====================================================
// Layout Profile Definitions
// =====================================================

export const LAYOUT_PROFILES = {
    pipeline: {
        description: 'Left-to-right sequential flow',
        bestFor: ['CI/CD', 'data pipelines', 'request flows', 'deployment processes'],
        defaultZones: 3,
        direction: 'LR'
    },
    hub: {
        description: 'Central hub with radiating connections',
        bestFor: ['API gateways', 'message brokers', 'load balancers', 'event hubs'],
        defaultZones: 4,
        direction: 'radial'
    },
    fanout: {
        description: 'One-to-many distribution pattern',
        bestFor: ['pub/sub', 'broadcast', 'replication', 'sharding'],
        defaultZones: 3,
        direction: 'LR'
    },
    tiered: {
        description: 'Layered architecture (frontend → backend → data)',
        bestFor: ['microservices', '3-tier apps', 'n-tier architecture'],
        defaultZones: 3,
        direction: 'TB'
    },
    swimlane: {
        description: 'Horizontal lanes for different actors/systems',
        bestFor: ['OAuth flows', 'multi-party interactions', 'protocol flows'],
        defaultZones: 4,
        direction: 'LR'
    }
};

// =====================================================
// Component Type Mappings
// =====================================================

export const COMPONENT_CATEGORIES = {
    kubernetes: ['pod', 'service', 'deployment', 'ingress', 'configmap', 'secret', 'pvc', 'node'],
    docker: ['container', 'image', 'registry', 'volume', 'network'],
    aws: ['ec2', 'lambda', 's3', 'rds', 'dynamodb', 'sqs', 'sns', 'elb', 'cloudfront'],
    gcp: ['compute', 'functions', 'storage', 'bigquery', 'pubsub'],
    azure: ['vm', 'functions', 'blob', 'cosmosdb', 'servicebus'],
    network: ['loadbalancer', 'firewall', 'dns', 'cdn', 'gateway'],
    database: ['postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch'],
    messaging: ['kafka', 'rabbitmq', 'nats', 'mqtt'],
    cicd: ['github', 'gitlab', 'jenkins', 'argocd', 'tekton'],
    generic: ['server', 'database', 'user', 'client', 'api', 'service', 'queue', 'cache']
};

// =====================================================
// Scene Planner Prompt - STRICT UNIQUENESS VERSION
// =====================================================

// Scene progression phases - each scene MUST be from a different phase
const SCENE_PHASES = [
    { name: 'trigger', desc: 'Initial trigger/user action', layouts: ['pipeline', 'swimlane'], components: ['user', 'browser', 'mobile', 'client'] },
    { name: 'ingress', desc: 'Entry point/gateway', layouts: ['hub', 'fanout'], components: ['gateway', 'loadbalancer', 'ingress', 'cdn'] },
    { name: 'processing', desc: 'Core business logic', layouts: ['pipeline', 'tiered'], components: ['api', 'service', 'lambda', 'container'] },
    { name: 'orchestration', desc: 'Workflow/messaging', layouts: ['hub', 'swimlane'], components: ['kafka', 'rabbitmq', 'sqs', 'queue'] },
    { name: 'persistence', desc: 'Data storage/caching', layouts: ['tiered', 'fanout'], components: ['database', 'redis', 's3', 'rds', 'cache'] },
    { name: 'response', desc: 'Response/completion', layouts: ['pipeline'], components: ['api', 'gateway', 'client'] }
];

const PLANNER_SYSTEM_PROMPT = `You are a Scene Architect. Create a CINEMATIC STORYBOARD for technical animations.

## ABSOLUTE RULES (VIOLATION = FAILURE)
1. Each scene MUST represent a COMPLETELY DIFFERENT architectural phase
2. NO TWO scenes may share more than 1 component type
3. Each scene MUST use a DIFFERENT layout profile from adjacent scenes
4. Scene titles MUST NOT contain words like "Overview", "System", "Final", "Complete"
5. Goals MUST be SPECIFIC actions, not descriptions

## OUTPUT FORMAT - Return ONLY valid JSON array:
[
  {
    "title": "ACTION-FOCUSED title (verb + noun)",
    "goal": "SPECIFIC viewer takeaway starting with 'Learn how...'",
    "layoutProfile": "pipeline | hub | fanout | tiered | swimlane",
    "zones": [
      { "id": "zone-actor", "label": "SPECIFIC name", "position": "left", "role": "actor/trigger" },
      { "id": "zone-process", "label": "SPECIFIC name", "position": "center", "role": "processing" },
      { "id": "zone-result", "label": "SPECIFIC name", "position": "right", "role": "outcome" }
    ],
    "primaryPath": ["comp-a", "comp-b", "comp-c", "comp-d"],
    "componentHints": ["tech-1", "tech-2", "tech-3", "tech-4"]
  }
]

## MANDATORY SCENE PHASES (one scene per phase):
1. TRIGGER: User action initiates flow (user, browser, CLI, webhook)
2. INGRESS: Entry point receives request (gateway, LB, ingress, CDN)
3. PROCESSING: Core logic executes (services, lambdas, containers)
4. ORCHESTRATION: Async/messaging coordination (Kafka, SQS, queues)
5. PERSISTENCE: Data stored/retrieved (DB, cache, S3, Redis)

## LAYOUT PROFILE RULES:
- pipeline: ONLY for linear A→B→C flows
- hub: ONLY when ONE central component connects to 3+ others
- fanout: ONLY for 1→N broadcast patterns
- tiered: ONLY for layered architectures (frontend→backend→data)
- swimlane: ONLY for multi-actor parallel flows

## ZONE NAMING (NEVER use generic names):
❌ BAD: "Source", "Process", "Destination", "Input", "Output"
✅ GOOD: "Developer Workstation", "API Gateway Cluster", "Redis Cache Pool"

## COMPONENT HINTS (use EXACT technology names):
Kubernetes: pod, service, deployment, ingress, configmap, secret, pvc, hpa
Docker: container, dockerfile, registry, compose
AWS: ec2, lambda, s3, rds, dynamodb, sqs, sns, elb, ecs, eks, cloudfront
GCP: compute, functions, gcs, bigquery, pubsub, gke
Network: loadbalancer, firewall, gateway, dns, cdn, waf
Database: postgres, mysql, mongodb, redis, elasticsearch, cassandra
Messaging: kafka, rabbitmq, nats, mqtt, sqs, sns
CI/CD: github, gitlab, jenkins, argocd, tekton, flux

## STRICT ANTI-PATTERNS:
❌ Repeating componentHints between scenes (INSTANT FAILURE)
❌ Same layoutProfile for consecutive scenes
❌ Generic zone names like "Layer 1", "Zone A"
❌ Titles longer than 4 words
❌ Same color scheme implied across scenes

Generate EXACTLY the requested number of UNIQUE scenes. Each must feel like a DIFFERENT chapter.`;

// =====================================================
// Scene Planner Class
// =====================================================

export class ScenePlanner {
    constructor(llmService) {
        this.llmService = llmService;
        this.defaultSceneCount = 5; // Higher quality scenes with phase progression
        this.usedComponents = new Set(); // Track used components across scenes
    }

    /**
     * Plan multi-scene outline from user prompt
     * @param {string} prompt - User's description
     * @param {Object} options - Planning options
     * @returns {Promise<Array>} Array of scene outlines
     */
    async plan(prompt, options = {}) {
        const sceneCount = options.sceneCount || this.defaultSceneCount;

        logger.info('Planning scenes', { prompt: prompt.substring(0, 50), sceneCount });

        // Build phase-specific guidance
        const phases = SCENE_PHASES.slice(0, sceneCount);
        const phaseGuide = phases.map((p, i) =>
            `Scene ${i + 1} (${p.name.toUpperCase()}): ${p.desc} - use ${p.layouts[0]} layout, include: ${p.components.slice(0, 2).join(', ')}`
        ).join('\n');

        const plannerPrompt = `Create EXACTLY ${sceneCount} DISTINCT scenes for: "${prompt}"

## PHASE ASSIGNMENT (follow exactly):
${phaseGuide}

## UNIQUENESS CHECKLIST:
✓ Each scene has 4+ unique components NOT used in other scenes
✓ Adjacent scenes use DIFFERENT layout profiles
✓ Zone labels are SPECIFIC to the technology (not generic)
✓ Titles are ACTION verbs: "Processing", "Routing", "Caching" NOT "Overview"

## COMPONENT DIVERSITY:
- Scene 1: Client-side components (user, browser, SDK)
- Scene 2: Edge components (gateway, CDN, WAF) 
- Scene 3: Compute components (pods, lambdas, containers)
- Scene 4: Messaging components (queues, topics, streams)
- Scene 5: Storage components (databases, caches, buckets)

Return JSON array with ${sceneCount} CINEMATICALLY DISTINCT scenes.`;


        try {
            const response = await this.llmService.callAPI(
                plannerPrompt,
                PLANNER_SYSTEM_PROMPT,
                { temperature: 0.85 } // Higher creativity for unique scenes
            );

            const outline = this.parseOutline(response);
            const validated = this.validateOutline(outline, sceneCount);

            logger.info('Scene planning complete', {
                scenes: validated.length,
                profiles: validated.map(s => s.layoutProfile)
            });

            return validated;
        } catch (error) {
            logger.error('Scene planning failed', error);
            // Return fallback outline
            return this.generateFallbackOutline(prompt, sceneCount);
        }
    }

    /**
     * Parse LLM response into outline array
     */
    parseOutline(response) {
        let content = response;

        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            content = jsonMatch[1];
        }

        // Clean up and parse
        content = content.trim();
        if (!content.startsWith('[')) {
            content = '[' + content;
        }
        if (!content.endsWith(']')) {
            content = content + ']';
        }

        try {
            return JSON.parse(content);
        } catch (e) {
            logger.warn('Failed to parse outline JSON, using fallback');
            return [];
        }
    }

    /**
     * Validate and fix outline structure
     */
    validateOutline(outline, targetCount) {
        if (!Array.isArray(outline)) {
            return this.generateFallbackOutline('', targetCount);
        }

        const validated = outline.map((scene, index) => ({
            title: scene.title || `Scene ${index + 1}`,
            goal: scene.goal || 'Demonstrate system behavior',
            layoutProfile: this.validateLayoutProfile(scene.layoutProfile),
            zones: this.validateZones(scene.zones || []),
            primaryPath: Array.isArray(scene.primaryPath) ? scene.primaryPath : ['client', 'server', 'database'],
            componentHints: Array.isArray(scene.componentHints) ? scene.componentHints : ['server', 'database']
        }));

        // Enhanced deduplication with component tracking
        const deduped = [];
        const usedTitles = new Set();
        const usedComponentSets = new Set();
        const usedLayoutProfiles = [];

        for (const scene of validated) {
            // Check title uniqueness (ignore case and common words)
            const titleKey = (scene.title || '').toLowerCase().replace(/^(scene\s*\d+:?\s*)/i, '').trim();
            if (usedTitles.has(titleKey)) {
                continue;
            }

            // Check component overlap - reject if >50% overlap with any existing scene
            const components = (scene.componentHints || []).map(c => c.toLowerCase());
            const componentKey = components.sort().join(',');
            let tooSimilar = false;

            for (const existingKey of usedComponentSets) {
                const existing = existingKey.split(',');
                const overlap = components.filter(c => existing.includes(c)).length;
                if (overlap > components.length * 0.5) {
                    tooSimilar = true;
                    break;
                }
            }
            if (tooSimilar) continue;

            // Ensure layout variety - avoid 3+ consecutive same layouts
            const layout = scene.layoutProfile;
            if (usedLayoutProfiles.length >= 2 &&
                usedLayoutProfiles[usedLayoutProfiles.length - 1] === layout &&
                usedLayoutProfiles[usedLayoutProfiles.length - 2] === layout) {
                // Force different layout
                const alternatives = ['pipeline', 'hub', 'tiered', 'fanout', 'swimlane'].filter(l => l !== layout);
                scene.layoutProfile = alternatives[deduped.length % alternatives.length];
            }

            usedTitles.add(titleKey);
            usedComponentSets.add(componentKey);
            usedLayoutProfiles.push(scene.layoutProfile);
            deduped.push(scene);
        }

        if (deduped.length === 0) {
            return this.generateFallbackOutline('', targetCount);
        }

        // Pad if we lost too many scenes
        while (deduped.length < targetCount && deduped.length < validated.length) {
            const padScene = validated.find(s => !deduped.includes(s));
            if (padScene) {
                deduped.push(padScene);
            } else {
                break;
            }
        }

        return deduped.slice(0, targetCount);
    }

    /**
     * Validate layout profile
     */
    validateLayoutProfile(profile) {
        const validProfiles = Object.keys(LAYOUT_PROFILES);
        if (validProfiles.includes(profile)) {
            return profile;
        }
        return 'pipeline'; // Default
    }

    /**
     * Validate zones array
     */
    validateZones(zones) {
        if (!Array.isArray(zones) || zones.length === 0) {
            return [
                { id: 'zone-source', label: 'Source', position: 'left', role: 'Origin' },
                { id: 'zone-process', label: 'Processing', position: 'center', role: 'Middleware' },
                { id: 'zone-dest', label: 'Destination', position: 'right', role: 'Storage' }
            ];
        }

        return zones.map((zone, i) => ({
            id: zone.id || `zone-${i}`,
            label: zone.label || `Zone ${i + 1}`,
            position: ['left', 'center', 'right'].includes(zone.position) ? zone.position : 'center',
            role: zone.role || 'Processing'
        }));
    }

    /**
     * Generate a default scene
     */
    generateDefaultScene(index) {
        return {
            title: `Scene ${index}: System State`,
            goal: 'Show current system state',
            layoutProfile: 'pipeline',
            zones: [
                { id: 'zone-source', label: 'Source', position: 'left', role: 'Input' },
                { id: 'zone-process', label: 'Process', position: 'center', role: 'Processing' },
                { id: 'zone-dest', label: 'Output', position: 'right', role: 'Storage' }
            ],
            primaryPath: ['client', 'server', 'database'],
            componentHints: ['server', 'database', 'client']
        };
    }

    /**
     * Generate fallback outline when LLM fails - now with TRUE variety
     */
    generateFallbackOutline(prompt, count) {
        logger.warn('Using fallback outline generation');

        // Phase-specific scene templates - each is COMPLETELY different
        const sceneTemplates = [
            {
                title: 'User Request Initiated',
                goal: 'Learn how client applications trigger the flow',
                layoutProfile: 'pipeline',
                zones: [
                    { id: 'zone-user', label: 'User Devices', position: 'left', role: 'Trigger' },
                    { id: 'zone-edge', label: 'Edge Network', position: 'center', role: 'Routing' },
                    { id: 'zone-entry', label: 'Entry Point', position: 'right', role: 'Reception' }
                ],
                primaryPath: ['browser', 'cdn', 'gateway'],
                componentHints: ['user', 'browser', 'cdn', 'loadbalancer']
            },
            {
                title: 'Gateway Authentication',
                goal: 'Learn how requests are validated at the edge',
                layoutProfile: 'hub',
                zones: [
                    { id: 'zone-auth', label: 'Auth Services', position: 'left', role: 'Validation' },
                    { id: 'zone-gateway', label: 'API Gateway', position: 'center', role: 'Central Hub' },
                    { id: 'zone-routes', label: 'Route Targets', position: 'right', role: 'Destinations' }
                ],
                primaryPath: ['gateway', 'auth', 'service'],
                componentHints: ['gateway', 'firewall', 'secret', 'configmap']
            },
            {
                title: 'Service Processing',
                goal: 'Learn how business logic transforms data',
                layoutProfile: 'tiered',
                zones: [
                    { id: 'zone-api', label: 'API Layer', position: 'left', role: 'Interface' },
                    { id: 'zone-logic', label: 'Business Logic', position: 'center', role: 'Processing' },
                    { id: 'zone-data', label: 'Data Access', position: 'right', role: 'Persistence' }
                ],
                primaryPath: ['api', 'service', 'repository'],
                componentHints: ['pod', 'deployment', 'service', 'configmap']
            },
            {
                title: 'Event Distribution',
                goal: 'Learn how events propagate through the system',
                layoutProfile: 'fanout',
                zones: [
                    { id: 'zone-producer', label: 'Event Producer', position: 'left', role: 'Source' },
                    { id: 'zone-broker', label: 'Message Broker', position: 'center', role: 'Distribution' },
                    { id: 'zone-consumers', label: 'Consumers', position: 'right', role: 'Handlers' }
                ],
                primaryPath: ['producer', 'kafka', 'consumer1', 'consumer2'],
                componentHints: ['kafka', 'sqs', 'sns', 'queue']
            },
            {
                title: 'Data Persistence',
                goal: 'Learn how data is stored and cached',
                layoutProfile: 'swimlane',
                zones: [
                    { id: 'zone-cache', label: 'Cache Layer', position: 'left', role: 'Hot Data' },
                    { id: 'zone-primary', label: 'Primary Storage', position: 'center', role: 'Source of Truth' },
                    { id: 'zone-backup', label: 'Replicas', position: 'right', role: 'Durability' }
                ],
                primaryPath: ['redis', 'postgres', 'replica'],
                componentHints: ['redis', 'postgres', 'pvc', 's3']
            }
        ];

        const scenes = [];
        for (let i = 0; i < count; i++) {
            const template = sceneTemplates[i % sceneTemplates.length];
            scenes.push({
                ...template,
                title: count > 5 ? `${template.title} (${Math.floor(i / 5) + 1})` : template.title,
                zones: template.zones.map(z => ({ ...z, id: `${z.id}-s${i}` }))
            });
        }

        return scenes;
    }
}

// =====================================================
// Factory Function
// =====================================================

let plannerInstance = null;

export function getScenePlanner(llmService) {
    if (!plannerInstance && llmService) {
        plannerInstance = new ScenePlanner(llmService);
    }
    return plannerInstance;
}

export default ScenePlanner;
