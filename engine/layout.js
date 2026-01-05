/**
 * Flow Animation Engine - Auto Layout Engine v6
 * 
 * Fixed anchor semantics:
 * - Internal layout uses CENTER coordinates
 * - Converts to correct anchor per type (center or top-left)
 * - Size-aware spacing based on actual component dimensions
 * - Fits content to 1200x700 viewBox
 * - Profile-aware placement with layout hints
 * 
 * @module engine/layout
 * @version 6.0.0
 */

import { createLogger } from './logger.js';
import { resolveTemplate } from './layout-templates.js';

const logger = createLogger('LayoutEngine');

// =====================================================
// Dimensions (matching connection-resolver.js)
// =====================================================

const DEFAULT_DIMENSIONS = {
    rectangle: { width: 120, height: 60 },
    circle: { radius: 35, width: 70, height: 70 },
    diamond: { size: 60, width: 120, height: 120 },
    hexagon: { size: 40, width: 80, height: 80 },
    cylinder: { width: 80, height: 100 },
    cloud: { width: 120, height: 70 },
    server: { width: 60, height: 80 },
    database: { width: 60, height: 80 },
    user: { width: 56, height: 80 },
    gear: { size: 30, width: 60, height: 60 },
    container: { width: 200, height: 150 }
};

// Types that use center anchor (others use top-left)
const CENTERED_TYPES = ['circle', 'diamond', 'hexagon', 'user', 'database', 'gear', 'server'];

// Type-based default colors
const TYPE_COLORS = {
    'user': '#6366f1',
    'rectangle': '#6366f1',
    'circle': '#10b981',
    'diamond': '#f59e0b',
    'hexagon': '#8b5cf6',
    'cylinder': '#ef4444',
    'cloud': '#f59e0b',
    'server': '#10b981',
    'database': '#ef4444',
    'gear': '#f59e0b',
    'container': '#14b8a6'
};

const ZONE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

// =====================================================
// Layout Configuration
// =====================================================

const DEFAULT_CONFIG = {
    viewBoxWidth: 1200,
    viewBoxHeight: 700,
    padding: 60,
    zoneGap: 50,
    zonePadding: 50,
    zoneLabelHeight: 30,
    componentGap: 30,
    columnGap: 80,
    rowGap: 90,
    minComponentGap: 16,
    minColumnGap: 40,
    minRowGap: 50,
    maxRepairPasses: 2,
    repairGrowth: 1.25,
    startX: 60,
    startY: 80,
    profile: 'pipeline',
    direction: 'LR',
    hints: {
        primaryPath: [],
        grouping: 'zone',
        compact: true
    }
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get component dimensions from type defaults
 */
function getDefaultSize(type) {
    const dims = DEFAULT_DIMENSIONS[type] || DEFAULT_DIMENSIONS.rectangle;
    return {
        width: dims.width || (dims.size ? dims.size * 2 : 60),
        height: dims.height || (dims.size ? dims.size * 2 : 60)
    };
}

/**
 * Get component dimensions from component overrides or defaults
 */
function getComponentSizeForComponent(component) {
    const type = component.type || 'rectangle';
    const defaults = getDefaultSize(type);
    let width = 0;
    let height = 0;

    if (Array.isArray(component.size)) {
        [width, height] = component.size;
    } else if (typeof component.size === 'number') {
        const sizeTypes = ['hexagon', 'diamond', 'gear'];
        if (sizeTypes.includes(type)) {
            width = component.size * 2;
            height = component.size * 2;
        } else {
            width = component.size;
            height = component.size;
        }
    }

    if (!width) width = component.width || defaults.width;
    if (!height) height = component.height || defaults.height;

    if (type === 'circle' && component.radius) {
        width = component.radius * 2;
        height = component.radius * 2;
    }

    return { width, height };
}

/**
 * Convert center coordinates to the coordinate the renderer expects
 */
function centerToAnchor(centerX, centerY, component) {
    const type = component.type || 'rectangle';
    const size = getComponentSizeForComponent(component);

    if (CENTERED_TYPES.includes(type)) {
        // Renderer expects center - return as is
        return { x: centerX, y: centerY };
    }
    // Renderer expects top-left - convert from center
    return {
        x: centerX - size.width / 2,
        y: centerY - size.height / 2
    };
}

/**
 * Get bounds for a component based on anchor semantics
 */
function getBoundsFromAnchor(component) {
    const size = getComponentSizeForComponent(component);
    const type = component.type || 'rectangle';
    const anchorX = component.x ?? 0;
    const anchorY = component.y ?? 0;

    if (CENTERED_TYPES.includes(type)) {
        return {
            x: anchorX - size.width / 2,
            y: anchorY - size.height / 2,
            width: size.width,
            height: size.height
        };
    }

    return {
        x: anchorX,
        y: anchorY,
        width: size.width,
        height: size.height
    };
}

function getComponentCenter(component) {
    const bounds = getBoundsFromAnchor(component);
    return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
    };
}

function linesIntersect(a1, a2, b1, b2) {
    const det = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
    if (det === 0) return false;
    const lambda = ((b2.y - b1.y) * (b2.x - a1.x) + (b1.x - b2.x) * (b2.y - a1.y)) / det;
    const gamma = ((a1.y - a2.y) * (b2.x - a1.x) + (a2.x - a1.x) * (b2.y - a1.y)) / det;
    return lambda > 0 && lambda < 1 && gamma > 0 && gamma < 1;
}

function scoreLayoutResult(scenario) {
    const components = scenario.components || [];
    const connections = scenario.connections || [];
    let overlaps = 0;
    let crossings = 0;

    for (let i = 0; i < components.length; i++) {
        const a = getBoundsFromAnchor(components[i]);
        for (let j = i + 1; j < components.length; j++) {
            const b = getBoundsFromAnchor(components[j]);
            const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
            const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
            if (overlapX > 0 && overlapY > 0) overlaps += 1;
        }
    }

    const connSegments = [];
    connections.forEach(conn => {
        const fromId = typeof conn.from === 'string' ? conn.from : conn.from?.id;
        const toId = typeof conn.to === 'string' ? conn.to : conn.to?.id;
        let fromPoint = null;
        let toPoint = null;
        if (fromId) {
            const comp = components.find(c => c.id === fromId);
            if (comp) fromPoint = getComponentCenter(comp);
        } else if (conn.from?.x !== undefined) {
            fromPoint = { x: conn.from.x, y: conn.from.y };
        }
        if (toId) {
            const comp = components.find(c => c.id === toId);
            if (comp) toPoint = getComponentCenter(comp);
        } else if (conn.to?.x !== undefined) {
            toPoint = { x: conn.to.x, y: conn.to.y };
        }
        if (fromPoint && toPoint) {
            connSegments.push({ from: fromPoint, to: toPoint, fromId, toId });
        }
    });

    for (let i = 0; i < connSegments.length; i++) {
        for (let j = i + 1; j < connSegments.length; j++) {
            const a = connSegments[i];
            const b = connSegments[j];
            if (a.fromId && (a.fromId === b.fromId || a.fromId === b.toId)) continue;
            if (a.toId && (a.toId === b.fromId || a.toId === b.toId)) continue;
            if (linesIntersect(a.from, a.to, b.from, b.to)) crossings += 1;
        }
    }

    return {
        overlaps,
        crossings,
        total: overlaps * 3 + crossings
    };
}

/**
 * Compute compacted gaps to fit content into available space
 */
function getCompactedGaps(config, neededPrimary, neededSecondary, isTB) {
    const availablePrimary = Math.max(
        1,
        (isTB ? config.viewBoxHeight : config.viewBoxWidth) - config.padding * 2
    );
    const availableSecondary = Math.max(
        1,
        (isTB ? config.viewBoxWidth : config.viewBoxHeight) - config.padding * 2
    );

    const scalePrimary = neededPrimary > 0 ? Math.min(1, availablePrimary / neededPrimary) : 1;
    const scaleSecondary = neededSecondary > 0 ? Math.min(1, availableSecondary / neededSecondary) : 1;
    const scale = Math.min(scalePrimary, scaleSecondary);

    const columnGap = Math.max(config.minColumnGap, Math.round(config.columnGap * scale));
    const rowGap = Math.max(config.minRowGap, Math.round(config.rowGap * scale));
    const componentGap = Math.max(config.minComponentGap, Math.round(config.componentGap * scale));

    return { columnGap, rowGap, componentGap };
}

/**
 * Assign rows centered around zero for a vertical stack
 */
function assignCenteredRows(components, centerId, flowIndex) {
    const ordered = [...components].sort((a, b) => {
        const aIdx = flowIndex.get(a.id) ?? 9999;
        const bIdx = flowIndex.get(b.id) ?? 9999;
        return aIdx - bIdx;
    });
    const rows = new Map();

    if (centerId && ordered.some(c => c.id === centerId)) {
        rows.set(centerId, 0);
    }

    let step = 1;
    ordered.forEach(comp => {
        if (rows.has(comp.id)) return;
        const row = rows.size % 2 === 0 ? step : -step;
        if (rows.size % 2 === 1) step += 1;
        rows.set(comp.id, row);
    });

    return rows;
}

// =====================================================
// Main Layout Algorithm
// =====================================================

export function calculateLayout(scenario, layoutConfig = {}) {
    logger.time('Auto-layout calculation');

    const templateDefaults = resolveTemplate(layoutConfig);
    const config = {
        ...DEFAULT_CONFIG,
        ...templateDefaults,
        ...layoutConfig,
        hints: {
            ...DEFAULT_CONFIG.hints,
            ...(layoutConfig?.hints || {})
        }
    };
    const isTB = config.direction === 'TB';
    const repairPass = config._repairPass || 0;
    const components = scenario.components || [];
    const zones = scenario.zones || [];

    if (components.length === 0) {
        return scenario;
    }

    const finalizeLayout = (updatedComponents, updatedZones, contentWidth, contentHeight) => {
        const result = {
            ...scenario,
            components: updatedComponents,
            zones: updatedZones && updatedZones.length > 0 ? updatedZones : (useZones ? scenario.zones : undefined),
            _layoutApplied: true,
            _stageWidth: Math.max(config.viewBoxWidth, contentWidth),
            _stageHeight: Math.max(config.viewBoxHeight, contentHeight)
        };

        const score = scoreLayoutResult(result);
        result._layoutScore = score;

        if ((score.overlaps > 0 || score.crossings > 2) && repairPass < config.maxRepairPasses) {
            const nextConfig = {
                ...config,
                columnGap: Math.round(config.columnGap * config.repairGrowth),
                rowGap: Math.round(config.rowGap * config.repairGrowth),
                componentGap: Math.round(config.componentGap * config.repairGrowth),
                hints: { ...config.hints, compact: false },
                _repairPass: repairPass + 1
            };
            logger.warn('Repair pass triggered', { pass: repairPass + 1, score });
            return calculateLayout(scenario, nextConfig);
        }

        return result;
    };

    const flowOrder = Array.isArray(scenario.flow) && scenario.flow.length > 0
        ? scenario.flow
        : components.map(c => c.id).filter(Boolean);
    const flowIndex = new Map(flowOrder.map((id, i) => [id, i]));
    const primaryPath = Array.isArray(config.hints.primaryPath) && config.hints.primaryPath.length > 0
        ? config.hints.primaryPath.filter(id => flowIndex.has(id) || components.some(c => c.id === id))
        : flowOrder;
    const primarySet = new Set(primaryPath);

    const connectionPairs = (scenario.connections || []).map(conn => ({
        from: typeof conn.from === 'string' ? conn.from : conn.from?.id,
        to: typeof conn.to === 'string' ? conn.to : conn.to?.id
    }));
    const parentMap = new Map();
    connectionPairs.forEach(conn => {
        if (conn.from && conn.to && primarySet.has(conn.from) && !primarySet.has(conn.to)) {
            if (!parentMap.has(conn.to)) {
                parentMap.set(conn.to, conn.from);
            }
        }
    });

    const grouping = config.hints.grouping || 'zone';
    const updatedComponents = [];
    const updatedZones = [];

    const groups = [];
    if (grouping === 'zone' && zones.length > 0) {
        zones.forEach((zone, i) => {
            groups.push({
                zone: { ...zone, color: zone.color || ZONE_COLORS[i % ZONE_COLORS.length] },
                components: components.filter(comp => comp.zone === zone.id),
                index: i
            });
        });
        const unzoned = components.filter(comp => !comp.zone);
        if (unzoned.length > 0) {
            groups.push({
                zone: null,
                components: unzoned,
                index: zones.length
            });
        }
    } else if (grouping === 'type') {
        const byType = new Map();
        components.forEach(comp => {
            const type = comp.type || 'rectangle';
            if (!byType.has(type)) byType.set(type, []);
            byType.get(type).push(comp);
        });
        [...byType.entries()].forEach(([type, comps], i) => {
            groups.push({
                zone: null,
                components: comps,
                index: i,
                label: type
            });
        });
    } else {
        groups.push({
            zone: null,
            components,
            index: 0
        });
    }

    const orderedComponentsIndex = new Map(components.map((c, i) => [c.id, i]));
    const getOrderIndex = (comp) => {
        if (flowIndex.has(comp.id)) return flowIndex.get(comp.id);
        return orderedComponentsIndex.get(comp.id) ?? 9999;
    };

    let currentPrimary = isTB ? config.startY : config.startX;
    const groupGap = config.zoneGap;
    const useZones = grouping === 'zone' && zones.length > 0;
    const groupPadding = useZones ? config.zonePadding : 0;
    const groupLabelHeight = useZones ? config.zoneLabelHeight : 0;

    if (useZones && config.profile === 'swimlane') {
        const baseGaps = {
            columnGap: config.columnGap,
            rowGap: config.rowGap,
            componentGap: config.componentGap
        };

        const maxFlowIndex = Math.max(0, ...flowOrder.map(id => flowIndex.get(id) || 0));
        const totalCols = maxFlowIndex + 1;

        let maxWidth = 0;
        let maxHeight = 0;
        components.forEach(comp => {
            const size = getComponentSizeForComponent(comp);
            maxWidth = Math.max(maxWidth, size.width);
            maxHeight = Math.max(maxHeight, size.height);
        });

        const estimatedPrimary = totalCols * (maxWidth + baseGaps.columnGap * 2);
        const estimatedSecondary = zones.length * (maxHeight + baseGaps.rowGap * 2);
        const gaps = config.hints.compact !== false
            ? getCompactedGaps(config, estimatedPrimary, estimatedSecondary, isTB)
            : baseGaps;

        const cellPrimary = (isTB ? maxHeight : maxWidth) + gaps.columnGap * 2;
        const cellSecondary = (isTB ? maxWidth : maxHeight) + gaps.rowGap * 2;
        const lanePrimary = totalCols * cellPrimary;
        const laneSecondary = cellSecondary;

        let current = isTB ? config.startY : config.startX;
        zones.forEach((zone, index) => {
            const zoneWidth = isTB
                ? Math.max(180, laneSecondary + config.zonePadding * 2)
                : Math.max(180, lanePrimary + config.zonePadding * 2);
            const zoneHeight = isTB
                ? Math.max(200, lanePrimary + config.zonePadding * 2 + config.zoneLabelHeight)
                : Math.max(200, laneSecondary + config.zonePadding * 2 + config.zoneLabelHeight);

            const zoneX = isTB ? config.startX : current;
            const zoneY = isTB ? current : config.startY;

            updatedZones.push({
                ...zone,
                color: zone.color || ZONE_COLORS[index % ZONE_COLORS.length],
                x: zoneX,
                y: zoneY,
                width: zoneWidth,
                height: zoneHeight
            });

            const contentStartX = zoneX + config.zonePadding + (isTB ? laneSecondary / 2 : cellPrimary / 2);
            const contentStartY = zoneY + config.zoneLabelHeight + config.zonePadding + (isTB ? cellPrimary / 2 : laneSecondary / 2);

            const zoneComponents = components.filter(comp => comp.zone === zone.id);
            zoneComponents.forEach(comp => {
                const col = flowIndex.get(comp.id) ?? 0;
                const centerX = isTB
                    ? contentStartX
                    : contentStartX + col * cellPrimary;
                const centerY = isTB
                    ? contentStartY + col * cellPrimary
                    : contentStartY;
                const anchor = centerToAnchor(centerX, centerY, comp);
                const type = comp.type || 'rectangle';
                updatedComponents.push({
                    ...comp,
                    x: anchor.x,
                    y: anchor.y,
                    position: [anchor.x, anchor.y],
                    color: comp.color || TYPE_COLORS[type] || '#6366f1'
                });
            });

            current += (isTB ? zoneHeight : zoneWidth) + config.zoneGap;
        });

        let maxX = 0, maxY = 0;
        updatedZones.forEach(z => {
            maxX = Math.max(maxX, z.x + z.width);
            maxY = Math.max(maxY, z.y + z.height);
        });
        updatedComponents.forEach(c => {
            const bounds = getBoundsFromAnchor(c);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        const contentWidth = maxX + config.padding;
        const contentHeight = maxY + config.padding;

        logger.timeEnd('Auto-layout calculation');
        logger.info('Layout complete', {
            zones: updatedZones.length,
            components: updatedComponents.length,
            contentWidth,
            contentHeight
        });

        return finalizeLayout(updatedComponents, updatedZones, contentWidth, contentHeight);
    }

    if (useZones && (config.profile === 'hub' || config.profile === 'fanout')) {
        const baseGaps = {
            columnGap: config.columnGap,
            rowGap: config.rowGap,
            componentGap: config.componentGap
        };

        const zoneStats = zones.map((zone, index) => {
            const zoneComps = components.filter(comp => comp.zone === zone.id);
            let maxWidth = 0;
            let maxHeight = 0;
            zoneComps.forEach(comp => {
                const size = getComponentSizeForComponent(comp);
                maxWidth = Math.max(maxWidth, size.width);
                maxHeight = Math.max(maxHeight, size.height);
            });
            return {
                zone: { ...zone, color: zone.color || ZONE_COLORS[index % ZONE_COLORS.length] },
                components: zoneComps,
                maxWidth: maxWidth || 60,
                maxHeight: maxHeight || 60
            };
        });

        const degrees = new Map();
        connectionPairs.forEach(conn => {
            if (!conn.from || !conn.to) return;
            degrees.set(conn.from, (degrees.get(conn.from) || 0) + 1);
            degrees.set(conn.to, (degrees.get(conn.to) || 0) + 1);
        });

        const pickHub = () => {
            if (primaryPath.length > 0) {
                const candidate = primaryPath.find(id => components.some(c => c.id === id));
                if (candidate) return candidate;
            }
            return [...degrees.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || components[0]?.id;
        };

        const pickSource = () => {
            if (primaryPath.length > 0) return primaryPath[0];
            const outDegrees = new Map();
            connectionPairs.forEach(conn => {
                if (conn.from && conn.to) {
                    outDegrees.set(conn.from, (outDegrees.get(conn.from) || 0) + 1);
                }
            });
            return [...outDegrees.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || components[0]?.id;
        };

        const centerId = config.profile === 'hub' ? pickHub() : pickSource();
        const centerComp = components.find(c => c.id === centerId);
        const centerZoneId = centerComp?.zone;

        const estimatedZones = zoneStats.map(stat => {
            const count = stat.components.length || 1;
            const cellHeight = stat.maxHeight + baseGaps.rowGap * 2;
            const zoneContentHeight = count * cellHeight;
            const zoneWidth = Math.max(180, stat.maxWidth + config.zonePadding * 2);
            const zoneHeight = Math.max(200, zoneContentHeight + config.zonePadding * 2 + config.zoneLabelHeight);
            return { zoneWidth, zoneHeight };
        });

        const estimatedPrimary = estimatedZones.reduce((sum, z) => sum + z.zoneWidth, 0) +
            Math.max(0, estimatedZones.length - 1) * config.zoneGap;
        const estimatedSecondary = estimatedZones.reduce((max, z) => Math.max(max, z.zoneHeight), 0);

        const gaps = config.hints.compact !== false
            ? getCompactedGaps(config, estimatedPrimary, estimatedSecondary, isTB)
            : baseGaps;

        let current = isTB ? config.startY : config.startX;
        zoneStats.forEach(stat => {
            const count = stat.components.length || 1;
            const cellHeight = stat.maxHeight + gaps.rowGap * 2;
            const zoneContentHeight = count * cellHeight;

            const zoneWidth = Math.max(180, stat.maxWidth + config.zonePadding * 2);
            const zoneHeight = Math.max(200, zoneContentHeight + config.zonePadding * 2 + config.zoneLabelHeight);

            const zoneX = isTB ? config.startX : current;
            const zoneY = isTB ? current : config.startY;

            updatedZones.push({
                ...stat.zone,
                x: zoneX,
                y: zoneY,
                width: zoneWidth,
                height: zoneHeight
            });

            const centerX = zoneX + zoneWidth / 2;
            const contentStartY = zoneY + config.zoneLabelHeight +
                (zoneHeight - config.zoneLabelHeight - zoneContentHeight) / 2 + cellHeight / 2;

            const zoneCenterId = stat.zone.id === centerZoneId ? centerId : null;
            const rowById = assignCenteredRows(stat.components, zoneCenterId, flowIndex);
            const rows = [...rowById.values()];
            const minRow = rows.length > 0 ? Math.min(...rows) : 0;

            stat.components.forEach(comp => {
                const row = rowById.get(comp.id) ?? 0;
                const rowOffset = row - minRow;
                const centerY = contentStartY + rowOffset * cellHeight;
                const anchor = centerToAnchor(centerX, centerY, comp);
                const type = comp.type || 'rectangle';
                updatedComponents.push({
                    ...comp,
                    x: anchor.x,
                    y: anchor.y,
                    position: [anchor.x, anchor.y],
                    color: comp.color || TYPE_COLORS[type] || '#6366f1'
                });
            });

            current += (isTB ? zoneHeight : zoneWidth) + config.zoneGap;
        });

        let maxX = 0, maxY = 0;
        updatedZones.forEach(z => {
            maxX = Math.max(maxX, z.x + z.width);
            maxY = Math.max(maxY, z.y + z.height);
        });
        updatedComponents.forEach(c => {
            const bounds = getBoundsFromAnchor(c);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        const contentWidth = maxX + config.padding;
        const contentHeight = maxY + config.padding;

        logger.timeEnd('Auto-layout calculation');
        logger.info('Layout complete', {
            zones: updatedZones.length,
            components: updatedComponents.length,
            contentWidth,
            contentHeight
        });

        return finalizeLayout(updatedComponents, updatedZones, contentWidth, contentHeight);
    }

    groups.sort((a, b) => a.index - b.index).forEach(group => {
        const groupComps = group.components || [];
        if (groupComps.length === 0) return;

        const orderedComps = [...groupComps].sort((a, b) => getOrderIndex(a) - getOrderIndex(b));

        let maxWidth = 0;
        let maxHeight = 0;
        orderedComps.forEach(comp => {
            const size = getComponentSizeForComponent(comp);
            maxWidth = Math.max(maxWidth, size.width);
            maxHeight = Math.max(maxHeight, size.height);
        });

        let zoneWidth = 0;
        let zoneHeight = 0;
        let zoneX = 0;
        let zoneY = 0;
        let contentWidth = 0;
        let contentHeight = 0;
        let contentStartX = 0;
        let contentStartY = 0;
        const baseGaps = {
            columnGap: config.columnGap,
            rowGap: config.rowGap,
            componentGap: config.componentGap
        };
        let gaps = baseGaps;

        if (config.profile === 'pipeline') {
            const rowById = new Map();
            const branchCountsByParent = new Map();
            let globalBranchCount = 0;

            orderedComps.forEach(comp => {
                if (primarySet.has(comp.id)) {
                    rowById.set(comp.id, 0);
                    return;
                }

                const parent = parentMap.get(comp.id);
                if (parent) {
                    const count = branchCountsByParent.get(parent) || 0;
                    const step = Math.floor(count / 2) + 1;
                    const row = count % 2 === 0 ? step : -step;
                    branchCountsByParent.set(parent, count + 1);
                    rowById.set(comp.id, row);
                    return;
                }

                const count = globalBranchCount++;
                const step = Math.floor(count / 2) + 1;
                const row = count % 2 === 0 ? step : -step;
                rowById.set(comp.id, row);
            });

            const rows = [...rowById.values()];
            const minRow = rows.length > 0 ? Math.min(...rows) : 0;
            const maxRow = rows.length > 0 ? Math.max(...rows) : 0;
            const rowCount = maxRow - minRow + 1;
            const cols = orderedComps.length;

            const maxPrimarySize = isTB ? maxHeight : maxWidth;
            const maxSecondarySize = isTB ? maxWidth : maxHeight;

            const estimatedPrimary = cols * (maxPrimarySize + baseGaps.columnGap * 2);
            const estimatedSecondary = rowCount * (maxSecondarySize + baseGaps.rowGap * 2);
            if (config.hints.compact !== false) {
                gaps = getCompactedGaps(config, estimatedPrimary, estimatedSecondary, isTB);
            }

            const cellPrimary = maxPrimarySize + gaps.columnGap * 2;
            const cellSecondary = maxSecondarySize + gaps.rowGap * 2;

            const contentPrimary = cols * cellPrimary;
            const contentSecondary = rowCount * cellSecondary;

            contentWidth = isTB ? contentSecondary : contentPrimary;
            contentHeight = isTB ? contentPrimary : contentSecondary;

            zoneWidth = useZones ? Math.max(180, contentWidth + groupPadding * 2) : contentWidth;
            zoneHeight = useZones ? Math.max(200, contentHeight + groupPadding * 2 + groupLabelHeight) : contentHeight;

            zoneX = isTB ? config.startX : currentPrimary;
            zoneY = isTB ? currentPrimary : config.startY;

            contentStartX = zoneX + (zoneWidth - contentWidth) / 2 + (isTB ? cellSecondary / 2 : cellPrimary / 2);
            contentStartY = zoneY + groupLabelHeight + (zoneHeight - groupLabelHeight - contentHeight) / 2 + (isTB ? cellPrimary / 2 : cellSecondary / 2);

            orderedComps.forEach((comp, i) => {
                const row = rowById.get(comp.id) ?? 0;
                const rowOffset = row - minRow;
                const centerX = isTB
                    ? contentStartX + rowOffset * cellSecondary
                    : contentStartX + i * cellPrimary;
                const centerY = isTB
                    ? contentStartY + i * cellPrimary
                    : contentStartY + rowOffset * cellSecondary;

                const anchor = centerToAnchor(centerX, centerY, comp);
                const type = comp.type || 'rectangle';

                updatedComponents.push({
                    ...comp,
                    x: anchor.x,
                    y: anchor.y,
                    position: [anchor.x, anchor.y],
                    color: comp.color || TYPE_COLORS[type] || '#6366f1'
                });
            });
        } else if (config.profile === 'tiered') {
            const cols = orderedComps.length;
            const maxPrimarySize = isTB ? maxHeight : maxWidth;
            const maxSecondarySize = isTB ? maxWidth : maxHeight;
            const estimatedPrimary = cols * (maxPrimarySize + baseGaps.columnGap * 2);
            const estimatedSecondary = maxSecondarySize + baseGaps.rowGap * 2;

            if (config.hints.compact !== false) {
                gaps = getCompactedGaps(config, estimatedPrimary, estimatedSecondary, isTB);
            }

            const cellPrimary = maxPrimarySize + gaps.columnGap * 2;
            const cellSecondary = maxSecondarySize + gaps.rowGap * 2;

            contentWidth = isTB ? cellSecondary : cols * cellPrimary;
            contentHeight = isTB ? cols * cellPrimary : cellSecondary;

            zoneWidth = useZones ? Math.max(180, contentWidth + groupPadding * 2) : contentWidth;
            zoneHeight = useZones ? Math.max(200, contentHeight + groupPadding * 2 + groupLabelHeight) : contentHeight;

            zoneX = isTB ? config.startX : currentPrimary;
            zoneY = isTB ? currentPrimary : config.startY;

            contentStartX = zoneX + (zoneWidth - contentWidth) / 2 + (isTB ? cellSecondary / 2 : cellPrimary / 2);
            contentStartY = zoneY + groupLabelHeight + (zoneHeight - groupLabelHeight - contentHeight) / 2 + (isTB ? cellPrimary / 2 : cellSecondary / 2);

            orderedComps.forEach((comp, i) => {
                const centerX = isTB
                    ? contentStartX
                    : contentStartX + i * cellPrimary;
                const centerY = isTB
                    ? contentStartY + i * cellPrimary
                    : contentStartY;
                const anchor = centerToAnchor(centerX, centerY, comp);
                const type = comp.type || 'rectangle';

                updatedComponents.push({
                    ...comp,
                    x: anchor.x,
                    y: anchor.y,
                    position: [anchor.x, anchor.y],
                    color: comp.color || TYPE_COLORS[type] || '#6366f1'
                });
            });
        } else if (config.profile === 'hub') {
            const degrees = new Map();
            connectionPairs.forEach(conn => {
                if (!conn.from || !conn.to) return;
                if (groupComps.find(c => c.id === conn.from) && groupComps.find(c => c.id === conn.to)) {
                    degrees.set(conn.from, (degrees.get(conn.from) || 0) + 1);
                    degrees.set(conn.to, (degrees.get(conn.to) || 0) + 1);
                }
            });

            let hubId = null;
            if (primaryPath.length > 0) {
                hubId = primaryPath.find(id => groupComps.some(c => c.id === id)) || null;
            }
            if (!hubId) {
                hubId = [...degrees.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || orderedComps[0].id;
            }

            const hubComp = orderedComps.find(c => c.id === hubId) || orderedComps[0];
            const spokes = orderedComps.filter(c => c.id !== hubComp.id);
            const count = spokes.length;

            const maxSize = Math.max(maxWidth, maxHeight);
            let radius = Math.max(120, maxSize + baseGaps.rowGap);
            if (count > 1) {
                radius = Math.max(radius, (count * (maxSize + baseGaps.columnGap)) / (2 * Math.PI));
            }

            const estimatedPrimary = radius * 2 + maxSize;
            const estimatedSecondary = radius * 2 + maxSize;
            if (config.hints.compact !== false) {
                gaps = getCompactedGaps(config, estimatedPrimary, estimatedSecondary, isTB);
            }

            radius = Math.max(100, (count > 1
                ? (count * (maxSize + gaps.columnGap)) / (2 * Math.PI)
                : maxSize + gaps.rowGap));

            contentWidth = radius * 2 + maxSize;
            contentHeight = radius * 2 + maxSize;

            zoneWidth = useZones ? Math.max(180, contentWidth + groupPadding * 2) : contentWidth;
            zoneHeight = useZones ? Math.max(200, contentHeight + groupPadding * 2 + groupLabelHeight) : contentHeight;

            zoneX = isTB ? config.startX : currentPrimary;
            zoneY = isTB ? currentPrimary : config.startY;

            const centerX = zoneX + zoneWidth / 2;
            const centerY = zoneY + groupLabelHeight + (zoneHeight - groupLabelHeight) / 2;

            const hubAnchor = centerToAnchor(centerX, centerY, hubComp);
            const hubType = hubComp.type || 'rectangle';
            updatedComponents.push({
                ...hubComp,
                x: hubAnchor.x,
                y: hubAnchor.y,
                position: [hubAnchor.x, hubAnchor.y],
                color: hubComp.color || TYPE_COLORS[hubType] || '#6366f1'
            });

            const startAngle = isTB ? Math.PI : -Math.PI / 2;
            const angleStep = count > 0 ? (Math.PI * 2) / count : 0;
            spokes.forEach((comp, i) => {
                const angle = startAngle + i * angleStep;
                const cx = centerX + Math.cos(angle) * radius;
                const cy = centerY + Math.sin(angle) * radius;
                const anchor = centerToAnchor(cx, cy, comp);
                const type = comp.type || 'rectangle';

                updatedComponents.push({
                    ...comp,
                    x: anchor.x,
                    y: anchor.y,
                    position: [anchor.x, anchor.y],
                    color: comp.color || TYPE_COLORS[type] || '#6366f1'
                });
            });
        } else if (config.profile === 'fanout') {
            const outDegrees = new Map();
            connectionPairs.forEach(conn => {
                if (conn.from && conn.to) {
                    outDegrees.set(conn.from, (outDegrees.get(conn.from) || 0) + 1);
                }
            });
            const sourceId = primaryPath[0] || [...outDegrees.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
            const sourceComp = orderedComps.find(c => c.id === sourceId) || orderedComps[0];
            const targets = orderedComps.filter(c => c.id !== sourceComp.id);

            const maxPrimarySize = isTB ? maxHeight : maxWidth;
            const maxSecondarySize = isTB ? maxWidth : maxHeight;
            const estimatedPrimary = 2 * (maxPrimarySize + baseGaps.columnGap * 2);
            const estimatedSecondary = Math.max(1, targets.length) * (maxSecondarySize + baseGaps.rowGap * 2);
            if (config.hints.compact !== false) {
                gaps = getCompactedGaps(config, estimatedPrimary, estimatedSecondary, isTB);
            }

            const cellPrimary = maxPrimarySize + gaps.columnGap * 2;
            const cellSecondary = maxSecondarySize + gaps.rowGap * 2;

            const targetCount = Math.max(1, targets.length);
            contentWidth = isTB ? targetCount * cellSecondary : cellPrimary * 2;
            contentHeight = isTB ? cellPrimary * 2 : targetCount * cellSecondary;

            zoneWidth = useZones ? Math.max(180, contentWidth + groupPadding * 2) : contentWidth;
            zoneHeight = useZones ? Math.max(200, contentHeight + groupPadding * 2 + groupLabelHeight) : contentHeight;

            zoneX = isTB ? config.startX : currentPrimary;
            zoneY = isTB ? currentPrimary : config.startY;

            const contentStartX = zoneX + (zoneWidth - contentWidth) / 2 + (isTB ? cellSecondary / 2 : cellPrimary / 2);
            const contentStartY = zoneY + groupLabelHeight + (zoneHeight - groupLabelHeight - contentHeight) / 2 + (isTB ? cellPrimary / 2 : cellSecondary / 2);

            const targetCenterX = isTB ? contentStartX : contentStartX + cellPrimary;
            const targetCenterY = isTB ? contentStartY + cellPrimary : contentStartY + contentHeight / 2;
            const sourceCenterX = isTB ? contentStartX + contentWidth / 2 : contentStartX;
            const sourceCenterY = isTB ? contentStartY : targetCenterY;

            const sourceAnchor = centerToAnchor(sourceCenterX, sourceCenterY, sourceComp);
            const sourceType = sourceComp.type || 'rectangle';
            updatedComponents.push({
                ...sourceComp,
                x: sourceAnchor.x,
                y: sourceAnchor.y,
                position: [sourceAnchor.x, sourceAnchor.y],
                color: sourceComp.color || TYPE_COLORS[sourceType] || '#6366f1'
            });

            const rows = targets.length;
            const firstRowOffset = rows > 0 ? -Math.floor(rows / 2) : 0;
            targets.forEach((comp, i) => {
                const rowOffset = firstRowOffset + i;
                const centerX = targetCenterX;
                const centerY = isTB
                    ? targetCenterY
                    : targetCenterY + rowOffset * cellSecondary;
                const adjCenterX = isTB
                    ? targetCenterX + rowOffset * cellSecondary
                    : centerX;
                const anchor = centerToAnchor(adjCenterX, centerY, comp);
                const type = comp.type || 'rectangle';
                updatedComponents.push({
                    ...comp,
                    x: anchor.x,
                    y: anchor.y,
                    position: [anchor.x, anchor.y],
                    color: comp.color || TYPE_COLORS[type] || '#6366f1'
                });
            });
        } else {
            const cols = orderedComps.length >= 3 ? 2 : 1;
            const rows = Math.ceil(orderedComps.length / cols);

            const estimatedPrimary = (isTB ? rows : cols) * (maxWidth + baseGaps.componentGap * 2);
            const estimatedSecondary = (isTB ? cols : rows) * (maxHeight + baseGaps.componentGap * 2);
            if (config.hints.compact !== false) {
                gaps = getCompactedGaps(config, estimatedPrimary, estimatedSecondary, isTB);
            }

            const cellWidth = maxWidth + gaps.componentGap * 2;
            const cellHeight = maxHeight + gaps.componentGap * 2;
            const zoneContentWidth = cols * cellWidth;
            const zoneContentHeight = rows * cellHeight;

            zoneWidth = useZones ? Math.max(180, zoneContentWidth + groupPadding * 2) : zoneContentWidth;
            zoneHeight = useZones ? Math.max(200, zoneContentHeight + groupPadding * 2 + groupLabelHeight) : zoneContentHeight;

            zoneX = isTB ? config.startX : currentPrimary;
            zoneY = isTB ? currentPrimary : config.startY;

            contentStartX = zoneX + (zoneWidth - zoneContentWidth) / 2 + cellWidth / 2;
            contentStartY = zoneY + groupLabelHeight + (zoneHeight - groupLabelHeight - zoneContentHeight) / 2 + cellHeight / 2;

            orderedComps.forEach((comp, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const centerX = contentStartX + col * cellWidth;
                const centerY = contentStartY + row * cellHeight;

                const anchor = centerToAnchor(centerX, centerY, comp);
                const type = comp.type || 'rectangle';

                updatedComponents.push({
                    ...comp,
                    x: anchor.x,
                    y: anchor.y,
                    position: [anchor.x, anchor.y],
                    color: comp.color || TYPE_COLORS[type] || '#6366f1'
                });
            });
        }

        if (useZones && group.zone) {
            updatedZones.push({
                ...group.zone,
                x: zoneX,
                y: zoneY,
                width: zoneWidth,
                height: zoneHeight
            });
        }

        currentPrimary += (isTB ? zoneHeight : zoneWidth) + groupGap;
    });

    // Calculate content bounds
    let maxX = 0, maxY = 0;
    updatedZones.forEach(z => {
        maxX = Math.max(maxX, z.x + z.width);
        maxY = Math.max(maxY, z.y + z.height);
    });
    updatedComponents.forEach(c => {
        const bounds = getBoundsFromAnchor(c);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    const contentWidth = maxX + config.padding;
    const contentHeight = maxY + config.padding;

    logger.timeEnd('Auto-layout calculation');
    logger.info('Layout complete', {
        zones: updatedZones.length,
        components: updatedComponents.length,
        contentWidth,
        contentHeight
    });

    return finalizeLayout(updatedComponents, updatedZones, contentWidth, contentHeight);
}

// =====================================================
// Step Generation
// =====================================================

export function generateStepsFromFlow(scenario) {
    const components = scenario.components || [];
    const connections = scenario.connections || [];
    const zones = scenario.zones || [];
    const flow = (Array.isArray(scenario.flow) && scenario.flow.length > 0)
        ? scenario.flow
        : (Array.isArray(scenario.layout?.hints?.primaryPath) && scenario.layout.hints.primaryPath.length > 0)
            ? scenario.layout.hints.primaryPath
            : components.map(c => c.id);

    const stepDescriptionFromScenario = (componentId, source) => {
        const comp = source.components?.find(c => c.id === componentId);
        if (comp?.description) return comp.description;
        return null;
    };

    if (!flow || flow.length === 0) return scenario;

    const connectionLookup = new Map();
    connections.forEach((conn, i) => {
        const from = typeof conn.from === 'string' ? conn.from : conn.from?.id;
        const to = typeof conn.to === 'string' ? conn.to : conn.to?.id;
        if (from && to) {
            connectionLookup.set(`${from}->${to}`, conn.id || `conn-${i}`);
        }
    });

    const steps = [];

    if (zones.length > 0) {
        steps.push({
            title: 'Setup',
            description: 'Initialize environment',
            actions: zones.map(z => ({ type: 'fadeIn', target: z.id }))
        });
    }

    let prevId = null;
    flow.forEach(componentId => {
        const comp = components.find(c => c.id === componentId);
        if (!comp) return;

        const actions = [{ type: 'fadeIn', target: componentId }];

        const connId = prevId ? connectionLookup.get(`${prevId}->${componentId}`) : null;
        if (connId) actions.push({ type: 'drawLine', target: connId });

        actions.push({ type: 'pulse', target: componentId });
        if (prevId) actions.push({ type: 'unglow', target: prevId });

        steps.push({
            title: comp.label || componentId,
            description: stepDescription || `${comp.label || componentId} activates`,
            actions
        });

        prevId = componentId;
    });

    steps.push({
        title: 'Complete',
        description: 'Flow complete',
        actions: flow.map(id => ({ type: 'glow', target: id }))
    });

    return {
        ...scenario,
        steps: scenario.steps?.length > 0 ? scenario.steps : steps
    };
}

// =====================================================
// Exports
// =====================================================

/**
 * Check if auto-layout should be applied.
 * AUTO-LAYOUT IS OPT-IN ONLY.
 * - If layout.mode === 'auto', apply auto-layout
 * - If layout.mode === 'manual' or not set, use manual x/y positions from YAML
 * - This keeps existing positioned scenarios working perfectly
 */
export function needsAutoLayout(scenario) {
    // Only apply auto-layout if explicitly requested
    return scenario.layout?.mode === 'auto';
}

export default {
    calculateLayout,
    generateStepsFromFlow,
    needsAutoLayout,
    TYPE_COLORS,
    CENTERED_TYPES,
    DEFAULT_DIMENSIONS
};
