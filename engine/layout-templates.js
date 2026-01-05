/**
 * Flow Animation Engine - Layout Templates
 * Deterministic defaults used by profiles and LLM/heuristic selectors.
 */

export const LAYOUT_TEMPLATES = {
    pipeline: { columnGap: 90, rowGap: 120, componentGap: 28 },
    hub: { columnGap: 70, rowGap: 90, componentGap: 24 },
    fanout: { columnGap: 80, rowGap: 110, componentGap: 24 },
    tiered: { columnGap: 100, rowGap: 80, componentGap: 26 },
    swimlane: { columnGap: 110, rowGap: 70, componentGap: 24 }
};

export function resolveTemplate(layoutConfig = {}) {
    const key = layoutConfig.template || layoutConfig.profile || 'pipeline';
    return LAYOUT_TEMPLATES[key] || LAYOUT_TEMPLATES.pipeline;
}

export default {
    LAYOUT_TEMPLATES,
    resolveTemplate
};
