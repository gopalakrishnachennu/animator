/**
 * Flow Animation Engine - Detail Augmenter
 * Stage 3: Small LLM call to polish step descriptions and highlights
 * 
 * Keeps layout deterministic while adding rich descriptions.
 * 
 * @module engine/detail-augmenter
 * @version 1.0.0
 */

import { createLogger } from './logger.js';

const logger = createLogger('DetailAugmenter');

// =====================================================
// Detail Augmenter System Prompt
// =====================================================

const AUGMENTER_SYSTEM_PROMPT = `You are a Detail Augmenter for animation scenarios.
Your job is to improve step descriptions and add animation highlights.

DO NOT modify the structure, components, or layout.
ONLY enhance:
1. Step titles (make them engaging)
2. Step descriptions (clear, educational)
3. Highlight targets (which components to emphasize)

OUTPUT FORMAT - Return JSON with enhanced steps:
{
  "steps": [
    {
      "title": "Enhanced Title",
      "description": "Clear, engaging description",
      "highlights": ["component-id-1", "component-id-2"]
    }
  ]
}

WRITING STYLE:
- Use active voice
- Be concise but informative
- Explain what is happening and why
- Make each step educational`;

// =====================================================
// Detail Augmenter Class
// =====================================================

export class DetailAugmenter {
    constructor(llmService) {
        this.llmService = llmService;
    }

    /**
     * Augment scenario with rich descriptions
     * @param {Object} scenario - Expanded scenario from TemplateExpander
     * @returns {Promise<Object>} Scenario with enhanced descriptions
     */
    async augment(scenario) {
        logger.info('Augmenting scenario details', { scenes: scenario.scenes?.length });

        if (!this.llmService || !scenario.scenes) {
            logger.warn('Skipping augmentation - no LLM service or scenes');
            return scenario;
        }

        try {
            // Augment each scene
            const augmentedScenes = await Promise.all(
                scenario.scenes.map((scene, i) => this.augmentScene(scene, i))
            );

            return {
                ...scenario,
                scenes: augmentedScenes
            };
        } catch (error) {
            logger.error('Augmentation failed, returning original', error);
            return scenario;
        }
    }

    /**
     * Augment a single scene
     */
    async augmentScene(scene, sceneIndex) {
        // Quick augmentation - just polish descriptions without LLM
        // This keeps the pipeline fast while still improving output
        const enhancedSteps = scene.steps.map((step, i) =>
            this.enhanceStepLocally(step, scene.components, i, sceneIndex)
        );

        return {
            ...scene,
            steps: enhancedSteps
        };
    }

    /**
     * Enhance step locally without LLM call
     * Uses templates and pattern matching for descriptions
     */
    enhanceStepLocally(step, components, stepIndex, sceneIndex) {
        const enhanced = { ...step };

        // Enhance title
        enhanced.title = this.enhanceTitle(step.title, stepIndex);

        // Enhance description
        enhanced.description = this.enhanceDescription(step, components);

        // Add highlights based on actions
        if (step.actions) {
            enhanced.highlights = step.actions
                .filter(a => a.target && a.type !== 'wait')
                .map(a => a.target)
                .slice(0, 3);
        }

        return enhanced;
    }

    /**
     * Enhance step title
     */
    enhanceTitle(title, index) {
        // Clean up generic titles
        if (title.match(/^Step \d+$/)) {
            const titles = [
                'Initialize System',
                'Deploy Components',
                'Establish Connections',
                'Configure Services',
                'Enable Data Flow',
                'Activate Monitoring',
                'Scale Resources',
                'Verify Health',
                'Complete Setup',
                'System Ready'
            ];
            return titles[index] || title;
        }
        return title;
    }

    /**
     * Enhance step description
     */
    enhanceDescription(step, components) {
        const desc = step.description || '';

        // If already good, keep it
        if (desc.length > 30) return desc;

        // Generate based on actions
        if (step.actions && step.actions.length > 0) {
            const action = step.actions[0];
            const target = components?.find(c => c.id === action.target);
            const targetLabel = target?.label || 'component';

            const templates = {
                fadeIn: `Bringing ${targetLabel} online and making it visible in the system.`,
                fadeOut: `Gracefully removing ${targetLabel} from the active system.`,
                drawLine: `Establishing communication pathway to enable data flow.`,
                pulse: `Highlighting ${targetLabel} to indicate activity.`,
                glow: `Emphasizing ${targetLabel} as the current focus.`,
                wait: 'Preparing for the next phase of the demonstration.'
            };

            return templates[action.type] || desc || 'Continuing with system configuration.';
        }

        return desc || 'Progressing through the workflow.';
    }

    /**
     * Full LLM augmentation for a scene (optional, slower)
     * Call this for premium/detailed generation
     */
    async augmentSceneWithLLM(scene, sceneIndex) {
        if (!this.llmService) return scene;

        const prompt = `Enhance these animation steps for scene "${scene.name}":

${JSON.stringify(scene.steps.map(s => ({
            title: s.title,
            description: s.description,
            actions: s.actions?.length || 0
        })), null, 2)}

Components available: ${scene.components?.map(c => c.label).join(', ')}

Make titles engaging and descriptions educational. Return enhanced steps JSON.`;

        try {
            const response = await this.llmService.callAPI(
                prompt,
                AUGMENTER_SYSTEM_PROMPT,
                { temperature: 0.5, maxTokens: 1000 }
            );

            const parsed = this.parseResponse(response);
            if (parsed?.steps) {
                return {
                    ...scene,
                    steps: scene.steps.map((step, i) => ({
                        ...step,
                        title: parsed.steps[i]?.title || step.title,
                        description: parsed.steps[i]?.description || step.description,
                        highlights: parsed.steps[i]?.highlights || []
                    }))
                };
            }
        } catch (error) {
            logger.warn('LLM augmentation failed, using local enhancement');
        }

        return scene;
    }

    /**
     * Parse LLM response
     */
    parseResponse(response) {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            logger.warn('Failed to parse augmenter response');
        }
        return null;
    }
}

// =====================================================
// Singleton Instance
// =====================================================

let augmenterInstance = null;

export function getDetailAugmenter(llmService) {
    if (!augmenterInstance && llmService) {
        augmenterInstance = new DetailAugmenter(llmService);
    }
    return augmenterInstance;
}

export default DetailAugmenter;
