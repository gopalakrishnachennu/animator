/**
 * Flow Animation Engine - Scene Analyzer
 * Heuristic layout/role inference for pasted scenarios (no network calls).
 *
 * @module engine/scene-analyzer
 * @version 1.0.0
 */

import { createLogger } from './logger.js';

const logger = createLogger('SceneAnalyzer');

const ROLE_KEYWORDS = [
    { role: 'source', words: ['user', 'client', 'browser', 'device'] },
    { role: 'gateway', words: ['gateway', 'api', 'ingress', 'edge', 'proxy'] },
    { role: 'service', words: ['service', 'app', 'api', 'worker'] },
    { role: 'queue', words: ['queue', 'topic', 'stream', 'broker'] },
    { role: 'cache', words: ['cache', 'redis', 'memcache'] },
    { role: 'database', words: ['db', 'database', 'sql', 'postgres', 'mysql'] },
    { role: 'storage', words: ['storage', 's3', 'bucket', 'blob'] },
    { role: 'sink', words: ['report', 'analytics', 'warehouse', 'sink'] }
];

const PROFILE_RULES = {
    fanout: (stats) => stats.maxOut >= 3,
    hub: (stats) => stats.maxDegree >= 4,
    tiered: (stats) => stats.hasTierZones,
    swimlane: (stats) => stats.hasZones && stats.zoneCount >= 3
};

function normalizeText(value) {
    return (value || '').toString().toLowerCase();
}

function inferRoles(components = []) {
    return components.map(comp => {
        const text = `${normalizeText(comp.id)} ${normalizeText(comp.label)}`;
        let role = comp.role;
        if (!role) {
            for (const entry of ROLE_KEYWORDS) {
                if (entry.words.some(w => text.includes(w))) {
                    role = entry.role;
                    break;
                }
            }
        }
        return { ...comp, role };
    });
}

function buildGraph(connections = []) {
    const edges = [];
    const inDegree = new Map();
    const outDegree = new Map();
    const degree = new Map();

    connections.forEach(conn => {
        const from = typeof conn.from === 'string' ? conn.from : conn.from?.id;
        const to = typeof conn.to === 'string' ? conn.to : conn.to?.id;
        if (!from || !to) return;
        edges.push({ from, to });
        outDegree.set(from, (outDegree.get(from) || 0) + 1);
        inDegree.set(to, (inDegree.get(to) || 0) + 1);
        degree.set(from, (degree.get(from) || 0) + 1);
        degree.set(to, (degree.get(to) || 0) + 1);
    });

    return { edges, inDegree, outDegree, degree };
}

function inferPrimaryPath(components = [], connections = []) {
    const { edges, inDegree, outDegree } = buildGraph(connections);
    const nodeIds = components.map(c => c.id).filter(Boolean);
    if (edges.length === 0) return nodeIds;

    const sources = nodeIds.filter(id => (inDegree.get(id) || 0) === 0);
    let current = sources[0] || nodeIds[0];
    const path = [];
    const visited = new Set();

    while (current && !visited.has(current)) {
        path.push(current);
        visited.add(current);
        const outgoing = edges.filter(e => e.from === current).map(e => e.to);
        if (outgoing.length === 0) break;
        outgoing.sort((a, b) => (outDegree.get(b) || 0) - (outDegree.get(a) || 0));
        current = outgoing[0];
    }

    return path.length > 0 ? path : nodeIds;
}

function hasTierZones(zones = []) {
    const labels = zones.map(z => normalizeText(z.label));
    const tierKeywords = ['frontend', 'backend', 'data', 'presentation', 'business'];
    return labels.some(label => tierKeywords.some(k => label.includes(k)));
}

export function inferLayoutHints(scenario) {
    if (!scenario || typeof scenario !== 'object') return {};

    const components = inferRoles(scenario.components || []);
    const zones = scenario.zones || [];
    const { outDegree, degree } = buildGraph(scenario.connections || []);
    const stats = {
        maxOut: Math.max(0, ...Array.from(outDegree.values())),
        maxDegree: Math.max(0, ...Array.from(degree.values())),
        hasZones: zones.length > 0,
        zoneCount: zones.length,
        hasTierZones: hasTierZones(zones)
    };

    let profile = scenario.layout?.profile;
    if (!profile) {
        if (PROFILE_RULES.fanout(stats)) profile = 'fanout';
        else if (PROFILE_RULES.hub(stats)) profile = 'hub';
        else if (PROFILE_RULES.tiered(stats)) profile = 'tiered';
        else if (PROFILE_RULES.swimlane(stats)) profile = 'swimlane';
        else profile = 'pipeline';
    }

    const primaryPath = scenario.flow && Array.isArray(scenario.flow) && scenario.flow.length > 0
        ? scenario.flow
        : inferPrimaryPath(components, scenario.connections || []);

    const hints = {
        primaryPath,
        grouping: scenario.layout?.hints?.grouping || (zones.length > 0 ? 'zone' : 'flow'),
        compact: scenario.layout?.hints?.compact ?? true
    };

    logger.debug('Inferred layout hints', { profile, hints });

    const template = scenario.layout?.template || profile;

    return { profile, template, hints, components };
}

export default {
    inferLayoutHints
};
