/**
 * Flow Animation Engine - Output Policy
 * Stage 5: Enforce minimum output requirements
 * 
 * Ensures generated scenarios meet quality thresholds.
 * 
 * @module engine/output-policy
 * @version 1.0.0
 */

import { createLogger } from './logger.js';

const logger = createLogger('OutputPolicy');

// =====================================================
// Default Policy Configuration
// =====================================================

export const DEFAULT_POLICY = {
    // If false, only trims to max limits and validates structure; no padding.
    allowPadding: true,
    // Scene requirements
    minScenes: 5,
    maxScenes: 10,

    // Steps per scene
    stepsPerScene: {
        min: 8,
        max: 12
    },

    // Zones per scene
    minZonesPerScene: 2,
    maxZonesPerScene: 4,

    // Components
    minComponentsPerZone: 2,
    maxComponentsPerScene: 12,

    // Connections
    minConnectionsPerScene: 3,
    maxConnectionsPerScene: 15,

    // Actions per step
    minActionsPerStep: 1
};

// =====================================================
// Output Policy Class
// =====================================================

export class OutputPolicy {
    constructor(customPolicy = {}) {
        this.policy = { ...DEFAULT_POLICY, ...customPolicy };
    }

    /**
     * Enforce output policy on scenario
     * @param {Object} scenario - Scenario to validate and pad
     * @param {Object} options - Override options
     * @returns {Object} Policy-compliant scenario
     */
    enforce(scenario, options = {}) {
        const policy = { ...this.policy, ...options };

        logger.info('Enforcing output policy', {
            targetScenes: policy.minScenes,
            currentScenes: scenario.scenes?.length,
            allowPadding: policy.allowPadding
        });

        // Ensure scenario structure
        if (!scenario.scenes) {
            scenario.scenes = [];
        }

        // Enforce scene count
        scenario = this.enforceSceneCount(scenario, policy);

        // Enforce per-scene requirements
        scenario.scenes = scenario.scenes.map((scene, i) =>
            this.enforceScenePolicy(scene, i, policy)
        );

        logger.info('Policy enforcement complete', {
            scenes: scenario.scenes.length,
            totalSteps: scenario.scenes.reduce((sum, s) => sum + (s.steps?.length || 0), 0)
        });

        return scenario;
    }

    /**
     * Enforce minimum scene count
     */
    enforceSceneCount(scenario, policy) {
        const { minScenes, maxScenes } = policy;

        if (policy.allowPadding) {
            // Pad if too few
            while (scenario.scenes.length < minScenes) {
                const index = scenario.scenes.length + 1;
                scenario.scenes.push(this.generatePaddingScene(index, scenario));
            }
        }

        // Trim if too many
        if (scenario.scenes.length > maxScenes) {
            scenario.scenes = scenario.scenes.slice(0, maxScenes);
        }

        return scenario;
    }

    /**
     * Enforce per-scene policy
     */
    enforceScenePolicy(scene, sceneIndex, policy) {
        // Ensure arrays exist
        scene.zones = scene.zones || [];
        scene.components = scene.components || [];
        scene.connections = scene.connections || [];
        scene.steps = scene.steps || [];

        // Enforce zones
        scene = this.enforceZones(scene, sceneIndex, policy);

        // Enforce components
        scene = this.enforceComponents(scene, sceneIndex, policy);

        // Enforce connections
        scene = this.enforceConnections(scene, policy);

        // Enforce steps
        scene = this.enforceSteps(scene, sceneIndex, policy);

        return scene;
    }

    /**
     * Enforce zone requirements
     */
    enforceZones(scene, sceneIndex, policy) {
        const { minZonesPerScene } = policy;

        if (!policy.allowPadding) {
            return scene;
        }

        while (scene.zones.length < minZonesPerScene) {
            const index = scene.zones.length;
            scene.zones.push({
                id: `zone-pad-${sceneIndex}-${index}`,
                label: ['Source', 'Processing', 'Destination'][index] || `Zone ${index + 1}`,
                x: 60 + index * 310,
                y: 80,
                width: 280,
                height: 350,
                color: 'rgba(203, 213, 224, 0.1)'
            });
        }

        return scene;
    }

    /**
     * Enforce component requirements
     */
    enforceComponents(scene, sceneIndex, policy) {
        const { minComponentsPerZone } = policy;
        const minTotal = minComponentsPerZone * scene.zones.length;

        if (!policy.allowPadding) {
            return scene;
        }

        if (scene.components.length < minTotal) {
            const defaultTypes = ['server', 'database', 'api', 'cache', 'queue', 'gateway'];
            let typeIndex = 0;

            scene.zones.forEach((zone, zoneIdx) => {
                const zoneComps = scene.components.filter(c => c.zone === zone.id);

                while (zoneComps.length < minComponentsPerZone) {
                    const compId = `comp-pad-${sceneIndex}-${scene.components.length}`;
                    const comp = {
                        id: compId,
                        type: 'rectangle',
                        label: defaultTypes[typeIndex++ % defaultTypes.length],
                        zone: zone.id,
                        x: zone.x + 40,
                        y: zone.y + 80 + (zoneComps.length * 90),
                        width: 100,
                        height: 60,
                        color: '#4A5568'
                    };
                    scene.components.push(comp);
                    zoneComps.push(comp);
                }
            });
        }

        return scene;
    }

    /**
     * Enforce connection requirements
     */
    enforceConnections(scene, policy) {
        const { minConnectionsPerScene } = policy;

        if (!policy.allowPadding) {
            return scene;
        }

        if (scene.connections.length < minConnectionsPerScene && scene.components.length >= 2) {
            // Add connections between adjacent components
            for (let i = 0; i < scene.components.length - 1 && scene.connections.length < minConnectionsPerScene; i++) {
                const existing = scene.connections.find(c =>
                    c.from === scene.components[i].id && c.to === scene.components[i + 1].id
                );

                if (!existing) {
                    scene.connections.push({
                        id: `conn-pad-${scene.connections.length}`,
                        from: scene.components[i].id,
                        to: scene.components[i + 1].id,
                        style: 'solid'
                    });
                }
            }
        }

        return scene;
    }

    /**
     * Enforce step requirements
     */
    enforceSteps(scene, sceneIndex, policy) {
        const { stepsPerScene, minActionsPerStep } = policy;

        if (policy.allowPadding) {
            // Ensure minimum steps
            while (scene.steps.length < stepsPerScene.min) {
                const stepIndex = scene.steps.length;
                scene.steps.push(this.generatePaddingStep(stepIndex, scene));
            }
        }

        // Trim if too many
        if (scene.steps.length > stepsPerScene.max) {
            scene.steps = scene.steps.slice(0, stepsPerScene.max);
        }

        // Ensure each step has actions
        scene.steps = scene.steps.map(step => {
            if (!step.actions || step.actions.length < minActionsPerStep) {
                step.actions = step.actions || [];
                step.actions.push({ type: 'wait', duration: 500 });
            }
            return step;
        });

        return scene;
    }

    /**
     * Generate a padding scene
     */
    generatePaddingScene(index, scenario) {
        const sceneNames = [
            'System Overview',
            'Component Initialization',
            'Service Discovery',
            'Data Flow',
            'Health Monitoring',
            'Scaling Operations',
            'Error Handling',
            'Recovery Process',
            'Performance Optimization',
            'Final State'
        ];

        return {
            name: `Scene ${index}: ${sceneNames[index - 1] || 'System State'}`,
            description: `Demonstrating ${sceneNames[index - 1]?.toLowerCase() || 'system behavior'}`,
            layout: { profile: 'pipeline', direction: 'LR' },
            zones: [],
            components: [],
            connections: [],
            steps: []
        };
    }

    /**
     * Generate a padding step
     */
    generatePaddingStep(index, scene) {
        const stepTemplates = [
            { title: 'Initialize', desc: 'Setting up initial state' },
            { title: 'Deploy', desc: 'Deploying components' },
            { title: 'Configure', desc: 'Configuring services' },
            { title: 'Connect', desc: 'Establishing connections' },
            { title: 'Activate', desc: 'Activating data flow' },
            { title: 'Monitor', desc: 'Enabling monitoring' },
            { title: 'Validate', desc: 'Validating configuration' },
            { title: 'Complete', desc: 'Finalizing setup' },
            { title: 'Verify', desc: 'Verifying health' },
            { title: 'Ready', desc: 'System is ready' }
        ];

        const template = stepTemplates[index] || stepTemplates[stepTemplates.length - 1];
        const targetComp = scene.components[index % scene.components.length];

        return {
            title: template.title,
            description: template.desc,
            actions: targetComp
                ? [{ type: 'fadeIn', target: targetComp.id }]
                : [{ type: 'wait', duration: 500 }]
        };
    }

    /**
     * Get policy summary
     */
    getSummary() {
        return {
            scenes: `${this.policy.minScenes}-${this.policy.maxScenes}`,
            stepsPerScene: `${this.policy.stepsPerScene.min}-${this.policy.stepsPerScene.max}`,
            zonesPerScene: `${this.policy.minZonesPerScene}-${this.policy.maxZonesPerScene}`,
            componentsPerZone: `min ${this.policy.minComponentsPerZone}`
        };
    }
}

// =====================================================
// Singleton Instance
// =====================================================

let policyInstance = null;

export function getOutputPolicy(customPolicy = {}) {
    if (!policyInstance) {
        policyInstance = new OutputPolicy(customPolicy);
    }
    return policyInstance;
}

export default OutputPolicy;
