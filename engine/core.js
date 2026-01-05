/**
 * Flow Animation Engine
 * Core animation engine for creating beautiful flow diagrams
 */

import { gsap } from 'gsap';

const MIN_DIMENSIONS = {
    rectangle: { width: 80, height: 40 },
    circle: { radius: 20 },
    diamond: { size: 25 },
    hexagon: { size: 25 },
    cylinder: { width: 60, height: 70 },
    cloud: { width: 90, height: 50 },
    server: { scale: 0.6 },
    database: { scale: 0.6 },
    user: { scale: 0.5 },
    gear: { size: 20 }
};

function clamp(value, min, max) {
    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;
    return value;
}

function computeFontSize(primarySize, min = 10, max = 14) {
    const size = primarySize * 0.35;
    return clamp(Math.round(size), min, max);
}

// =====================================================
// Shape Factory - Creates SVG shapes
// =====================================================

export const ShapeFactory = {

    // Basic Shapes
    rectangle: (props = {}) => {
        const { x = 0, y = 0, width = 120, height = 60, color = '#6366f1', label = '', radius = 8 } = props;
        const min = MIN_DIMENSIONS.rectangle;
        const w = clamp(width, min.width);
        const h = clamp(height, min.height);
        const fontSize = computeFontSize(Math.min(w, h));
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group');
        g.innerHTML = `
            <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" 
                  fill="${color}" stroke="${lightenColor(color, 20)}" stroke-width="2" class="shape-body"/>
            ${label ? `<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" class="shape-label" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    circle: (props = {}) => {
        const { x = 0, y = 0, radius = 35, color = '#10b981', label = '' } = props;
        const r = clamp(radius, MIN_DIMENSIONS.circle.radius);
        const fontSize = computeFontSize(r * 2);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group');
        g.innerHTML = `
            <circle cx="${x}" cy="${y}" r="${r}" 
                    fill="${color}" stroke="${lightenColor(color, 20)}" stroke-width="2" class="shape-body"/>
            ${label ? `<text x="${x}" y="${y + 5}" text-anchor="middle" class="shape-label" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    diamond: (props = {}) => {
        const { x = 0, y = 0, size = 60, color = '#f59e0b', label = '' } = props;
        const s = clamp(size, MIN_DIMENSIONS.diamond.size);
        const half = s / 2;
        const fontSize = computeFontSize(s);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group');
        g.innerHTML = `
            <polygon points="${x},${y - half} ${x + half},${y} ${x},${y + half} ${x - half},${y}" 
                     fill="${color}" stroke="${lightenColor(color, 20)}" stroke-width="2" class="shape-body"/>
            ${label ? `<text x="${x}" y="${y + 5}" text-anchor="middle" class="shape-label" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    hexagon: (props = {}) => {
        const { x = 0, y = 0, size = 40, color = '#326CE5', label = '' } = props;
        const s = clamp(size, MIN_DIMENSIONS.hexagon.size);
        const fontSize = computeFontSize(s);
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60 - 30) * Math.PI / 180;
            points.push(`${x + s * Math.cos(angle)},${y + s * Math.sin(angle)}`);
        }
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group');
        g.innerHTML = `
            <polygon points="${points.join(' ')}" 
                     fill="${color}" stroke="${lightenColor(color, 20)}" stroke-width="2" class="shape-body"/>
            ${label ? `<text x="${x}" y="${y + 5}" text-anchor="middle" class="shape-label" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    cylinder: (props = {}) => {
        const { x = 0, y = 0, width = 80, height = 100, color = '#8b5cf6', label = '' } = props;
        const min = MIN_DIMENSIONS.cylinder;
        const w = clamp(width, min.width);
        const h = clamp(height, min.height);
        const ry = 12;
        const fontSize = computeFontSize(Math.min(w, h));
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group');
        g.innerHTML = `
            <ellipse cx="${x + w / 2}" cy="${y + ry}" rx="${w / 2}" ry="${ry}" fill="${lightenColor(color, 10)}"/>
            <rect x="${x}" y="${y + ry}" width="${w}" height="${h - ry * 2}" fill="${color}"/>
            <ellipse cx="${x + w / 2}" cy="${y + h - ry}" rx="${w / 2}" ry="${ry}" fill="${darkenColor(color, 15)}"/>
            <ellipse cx="${x + w / 2}" cy="${y + ry}" rx="${w / 2}" ry="${ry}" fill="none" stroke="${lightenColor(color, 20)}" stroke-width="2"/>
            ${label ? `<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" class="shape-label" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    cloud: (props = {}) => {
        const { x = 0, y = 0, width = 120, height = 70, color = '#3b82f6', label = '' } = props;
        const min = MIN_DIMENSIONS.cloud;
        const w = clamp(width, min.width);
        const h = clamp(height, min.height);
        const fontSize = computeFontSize(Math.min(w, h));
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group');
        g.innerHTML = `
            <path d="M${x + 25} ${y + h - 10}
                     a20 20 0 0 1 0 -40
                     a25 25 0 0 1 45 -10
                     a30 30 0 0 1 30 50
                     z" 
                  fill="${color}" stroke="${lightenColor(color, 20)}" stroke-width="2" class="shape-body"/>
            ${label ? `<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" class="shape-label" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    // Icon-based shapes
    server: (props = {}) => {
        const { x = 0, y = 0, size = 1, label = '' } = props;
        const scale = clamp(size, MIN_DIMENSIONS.server.scale);
        const w = 60 * scale;
        const h = 80 * scale;
        const fontSize = computeFontSize(Math.min(w, h));
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group icon-shape');
        g.innerHTML = `
            <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${6 * scale}" fill="#374151" stroke="#6b7280" stroke-width="2"/>
            <circle cx="${x}" cy="${y - h * 0.3125}" r="${4 * scale}" fill="#10b981" class="indicator"/>
            <rect x="${x - w * 0.333}" y="${y - h * 0.125}" width="${w * 0.666}" height="${8 * scale}" rx="${2 * scale}" fill="#4b5563"/>
            <rect x="${x - w * 0.333}" y="${y + h * 0.0625}" width="${w * 0.666}" height="${8 * scale}" rx="${2 * scale}" fill="#4b5563"/>
            <rect x="${x - w * 0.333}" y="${y + h * 0.25}" width="${w * 0.666}" height="${8 * scale}" rx="${2 * scale}" fill="#4b5563"/>
            ${label ? `<text x="${x}" y="${y + h / 2 + 15 * scale}" text-anchor="middle" class="shape-sublabel" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    database: (props = {}) => {
        const { x = 0, y = 0, color = '#8b5cf6', size = 1, label = '' } = props;
        const scale = clamp(size, MIN_DIMENSIONS.database.scale);
        const w = 60 * scale;
        const h = 80 * scale;
        const ry = 12 * scale;
        const fontSize = computeFontSize(Math.min(w, h));
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group icon-shape');
        g.innerHTML = `
            <ellipse cx="${x}" cy="${y - h / 2 + ry}" rx="${w / 2}" ry="${ry}" fill="${lightenColor(color, 10)}"/>
            <rect x="${x - w / 2}" y="${y - h / 2 + ry}" width="${w}" height="${h - ry * 2}" fill="${color}"/>
            <ellipse cx="${x}" cy="${y + h / 2 - ry}" rx="${w / 2}" ry="${ry}" fill="${darkenColor(color, 15)}"/>
            <ellipse cx="${x}" cy="${y - h / 2 + ry}" rx="${w / 2}" ry="${ry}" fill="none" stroke="${lightenColor(color, 20)}" stroke-width="2"/>
            <ellipse cx="${x}" cy="${y - h / 2 + ry + (h * 0.25)}" rx="${w / 2}" ry="${ry}" fill="none" stroke="${lightenColor(color, 10)}" stroke-width="1" opacity="0.5"/>
            <ellipse cx="${x}" cy="${y - h / 2 + ry + (h * 0.5)}" rx="${w / 2}" ry="${ry}" fill="none" stroke="${lightenColor(color, 10)}" stroke-width="1" opacity="0.5"/>
            ${label ? `<text x="${x}" y="${y + h / 2 + 15 * scale}" text-anchor="middle" class="shape-sublabel" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    user: (props = {}) => {
        const { x = 0, y = 0, color = '#6366f1', size = 1, label = '' } = props;
        const scale = clamp(size, MIN_DIMENSIONS.user.scale);
        const headR = 18 * scale;
        const bodyW = 28 * scale;
        const bodyH = 30 * scale;
        const fontSize = computeFontSize(Math.max(headR * 2, bodyH));
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group icon-shape');
        g.innerHTML = `
            <circle cx="${x}" cy="${y - headR}" r="${headR}" fill="${color}"/>
            <path d="M${x - bodyW} ${y + headR + bodyH} Q${x - bodyW} ${y + headR} ${x} ${y + headR} Q${x + bodyW} ${y + headR} ${x + bodyW} ${y + headR + bodyH}" fill="${color}"/>
            ${label ? `<text x="${x}" y="${y + headR + bodyH + 20 * scale}" text-anchor="middle" class="shape-sublabel" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    gear: (props = {}) => {
        const { x = 0, y = 0, size = 30, color = '#f59e0b', label = '' } = props;
        const s = clamp(size, MIN_DIMENSIONS.gear.size);
        const fontSize = computeFontSize(s);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'shape-group icon-shape');
        // Simplified gear shape
        const teeth = 8;
        let path = '';
        for (let i = 0; i < teeth; i++) {
            const angle1 = (i * 360 / teeth) * Math.PI / 180;
            const angle2 = ((i + 0.5) * 360 / teeth) * Math.PI / 180;
            const r1 = s;
            const r2 = s * 0.75;
            if (i === 0) {
                path = `M${x + r1 * Math.cos(angle1)},${y + r1 * Math.sin(angle1)}`;
            }
            path += ` L${x + r1 * Math.cos(angle2)},${y + r1 * Math.sin(angle2)}`;
            path += ` L${x + r2 * Math.cos(angle2)},${y + r2 * Math.sin(angle2)}`;
            const angle3 = ((i + 1) * 360 / teeth) * Math.PI / 180;
            path += ` L${x + r2 * Math.cos(angle3)},${y + r2 * Math.sin(angle3)}`;
            path += ` L${x + r1 * Math.cos(angle3)},${y + r1 * Math.sin(angle3)}`;
        }
        path += ' Z';
        g.innerHTML = `
            <path d="${path}" fill="${color}" stroke="${lightenColor(color, 20)}" stroke-width="2"/>
            <circle cx="${x}" cy="${y}" r="${s * 0.35}" fill="#0a0e14"/>
            ${label ? `<text x="${x}" y="${y + s + 20}" text-anchor="middle" class="shape-sublabel" style="font-size:${fontSize}px">${label}</text>` : ''}
        `;
        return g;
    },

    // Container/Zone
    zone: (props = {}) => {
        const {
            x = 0,
            y = 0,
            width = 300,
            height = 200,
            color = '#6366f1',
            label = '',
            opacity = 0.08,
            labelPosition = 'top-left'
        } = props;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'zone-group');
        let labelX = x + 12;
        let labelY = y + 20;
        if (labelPosition === 'top-center') {
            labelX = x + width / 2;
            labelY = y + 20;
        } else if (labelPosition === 'outside-top') {
            labelX = x + 12;
            labelY = y - 10;
        }
        g.innerHTML = `
            <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" 
                  fill="${color}" fill-opacity="${opacity}" 
                  stroke="${color}" stroke-width="1" stroke-dasharray="4 2" stroke-opacity="0.4"/>
            ${label ? `<text x="${labelX}" y="${labelY}" text-anchor="${labelPosition === 'top-center' ? 'middle' : 'start'}" class="zone-label">${label}</text>` : ''}
        `;
        return g;
    },

    // Annotation/Label box
    annotation: (props = {}) => {
        const { x = 0, y = 0, text = '', width = 'auto' } = props;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'annotation-group');
        const padding = 12;
        const w = width === 'auto' ? text.length * 8 + padding * 2 : width;
        g.innerHTML = `
            <rect x="${x}" y="${y}" width="${w}" height="34" rx="10"
                  class="annotation-box"/>
            <text x="${x + w / 2}" y="${y + 22}" text-anchor="middle" class="annotation-text">${text}</text>
        `;
        return g;
    }
};

// =====================================================
// Connection Factory - Creates lines and arrows
// =====================================================

export const ConnectionFactory = {

    // Straight line with arrow
    arrow: (props = {}) => {
        const { from, to, color = '#6366f1', dashed = false, animated = false, strokeWidth = 2.5 } = props;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'connection-group');

        const dasharray = dashed ? 'stroke-dasharray="8 4"' : '';
        const animClass = animated ? 'class="animate-flow"' : '';

        g.innerHTML = `
            <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" 
                  stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" ${dasharray} ${animClass}
                  marker-end="url(#arrow-marker)"/>
        `;
        return g;
    },

    // Curved connection (bezier)
    curve: (props = {}) => {
        const { from, to, color = '#6366f1', curvature = 50, dashed = false, strokeWidth = 2.5 } = props;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'connection-group');

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 - curvature;
        const dasharray = dashed ? 'stroke-dasharray="8 4"' : '';

        g.innerHTML = `
            <path d="M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}" 
                  fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" ${dasharray}
                  marker-end="url(#arrow-marker)"/>
        `;
        return g;
    },

    // Orthogonal (right-angle) connection
    orthogonal: (props = {}) => {
        const { from, to, color = '#6366f1', dashed = false, strokeWidth = 2.5 } = props;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'connection-group');

        const midX = (from.x + to.x) / 2;
        const dasharray = dashed ? 'stroke-dasharray="8 4"' : '';

        g.innerHTML = `
            <path d="M${from.x},${from.y} L${midX},${from.y} L${midX},${to.y} L${to.x},${to.y}" 
                  fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${dasharray}
                  marker-end="url(#arrow-marker)"/>
        `;
        return g;
    }
};

// =====================================================
// Animation Engine
// =====================================================

export class AnimationEngine {
    constructor(stageId) {
        this.stage = document.getElementById(stageId);
        this.componentsLayer = this.stage.querySelector('#components-layer');
        this.connectionsLayer = this.stage.querySelector('#connections-layer');
        this.labelsLayer = this.stage.querySelector('#labels-layer');
        this.effectsLayer = this.stage.querySelector('#effects-layer');

        this.timeline = gsap.timeline({ paused: true });
        this.components = new Map();
        this.connections = new Map();
        this.labels = new Map();
        this.currentStep = 0;
        this.steps = [];
        this.speed = 1;
        this.isPlaying = false;
        this.loopEnabled = false;

        this.onStepChange = null;
        this.onComplete = null;
        this.onLoopRestart = null;
    }

    // Clear all content
    clear() {
        this.componentsLayer.innerHTML = '';
        this.connectionsLayer.innerHTML = '';
        this.labelsLayer.innerHTML = '';
        this.effectsLayer.innerHTML = '';
        this.components.clear();
        this.connections.clear();
        this.labels.clear();
        this.timeline.clear();
        this.currentStep = 0;
        this.steps = [];
    }

    // Add a component to the stage
    addComponent(id, type, props) {
        if (!ShapeFactory[type]) {
            console.error(`Unknown shape type: ${type}`);
            return null;
        }

        const element = ShapeFactory[type](props);
        element.setAttribute('id', id);
        element.setAttribute('data-type', type);
        element.style.opacity = '0';

        this.componentsLayer.appendChild(element);
        this.components.set(id, { element, type, props });

        return element;
    }

    // Add a connection between components
    addConnection(id, type, props) {
        if (!ConnectionFactory[type]) {
            console.error(`Unknown connection type: ${type}`);
            return null;
        }

        const element = ConnectionFactory[type](props);
        element.setAttribute('id', id);
        element.style.opacity = '0';

        this.connectionsLayer.appendChild(element);
        this.connections.set(id, { element, type, props });

        return element;
    }

    // Add annotation/label
    addLabel(id, props) {
        const element = ShapeFactory.annotation(props);
        element.setAttribute('id', id);
        element.style.opacity = '0';
        this.labelsLayer.appendChild(element);
        this.labels.set(id, { element, props });
        return element;
    }

    // Add zone/container
    addZone(id, props) {
        const element = ShapeFactory.zone(props);
        element.setAttribute('id', id);
        element.style.opacity = '0';
        // Insert zones at the beginning so they're behind
        this.componentsLayer.insertBefore(element, this.componentsLayer.firstChild);
        this.components.set(id, { element, type: 'zone', props });
        return element;
    }

    // Build animation timeline from steps
    buildTimeline(steps) {
        this.steps = steps;
        this.timeline.clear();

        steps.forEach((step, index) => {
            const label = `step-${index}`;
            this.timeline.addLabel(label);

            // Add step callback
            this.timeline.call(() => {
                this.currentStep = index;
                if (this.onStepChange) {
                    this.onStepChange(index, step);
                }
            }, [], label);

            // Process step actions
            this.processStep(step, label);

            // Add pause between steps
            if (step.pause !== false) {
                this.timeline.to({}, { duration: step.pauseDuration || 0.5 });
            }
        });

        // Add completion callback
        this.timeline.call(() => {
            if (this.loopEnabled) {
                // Loop: reset and restart
                this.resetAllElements();
                this.currentStep = 0;
                if (this.onLoopRestart) {
                    this.onLoopRestart();
                }
                this.timeline.seek(0);
                this.timeline.play();
            } else {
                this.isPlaying = false;
                if (this.onComplete) {
                    this.onComplete();
                }
            }
        });

        return this;
    }

    // Reset all elements to initial state (for looping)
    resetAllElements() {
        this.components.forEach(({ element }) => {
            if (element) element.style.opacity = '0';
        });
        this.connections.forEach(({ element }) => {
            if (element) element.style.opacity = '0';
        });
    }

    // Process a single step
    processStep(step, label) {
        const actions = Array.isArray(step.actions) ? step.actions : [step];

        actions.forEach(action => {
            const target = typeof action.target === 'string'
                ? this.stage.querySelector(`#${action.target}`)
                : action.target;

            if (!target && action.type !== 'wait') {
                console.warn(`Target not found: ${action.target}`);
                return;
            }

            const duration = action.duration || 0.5;
            const ease = action.ease || 'power2.out';
            const delay = action.delay || 0;

            switch (action.type) {
                case 'appear':
                case 'fadeIn':
                    this.timeline.to(target, {
                        opacity: 1,
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                case 'fadeOut':
                    this.timeline.to(target, {
                        opacity: 0,
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                case 'moveTo':
                    this.timeline.to(target, {
                        x: action.x || 0,
                        y: action.y || 0,
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                case 'scale':
                    this.timeline.to(target, {
                        scale: action.scale || 1,
                        duration,
                        ease,
                        delay,
                        transformOrigin: 'center center'
                    }, action.position || label);
                    break;

                case 'pulse':
                    this.timeline.to(target, {
                        scale: 1.15,
                        duration: duration / 2,
                        ease: 'power2.out',
                        delay
                    }, action.position || label)
                        .to(target, {
                            scale: 1,
                            duration: duration / 2,
                            ease: 'power2.in'
                        });
                    break;

                case 'highlight':
                    const body = target.querySelector('.shape-body') || target;
                    this.timeline.to(body, {
                        filter: 'drop-shadow(0 0 15px ' + (action.color || '#6366f1') + ')',
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                case 'unhighlight':
                    const bodyUn = target.querySelector('.shape-body') || target;
                    this.timeline.to(bodyUn, {
                        filter: 'none',
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                case 'drawLine':
                    const line = target.querySelector('line, path');
                    if (line) {
                        const length = line.getTotalLength ? line.getTotalLength() : 100;
                        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
                        this.timeline.to(target, { opacity: 1, duration: 0.1 }, action.position || label);
                        this.timeline.to(line, {
                            strokeDashoffset: 0,
                            duration,
                            ease: 'none',
                            delay
                        }, action.position || label);
                    }
                    break;

                case 'wait':
                    this.timeline.to({}, { duration: action.duration || 1 }, action.position || label);
                    break;

                case 'color':
                    const colorTarget = target.querySelector('.shape-body') || target;
                    this.timeline.to(colorTarget, {
                        fill: action.color,
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                case 'callout':
                    const calloutTarget = typeof action.target === 'string'
                        ? this.stage.querySelector(`#${action.target}`)
                        : action.target;
                    if (!calloutTarget) return;
                    const offset = Array.isArray(action.offset) ? action.offset : [0, -50];
                    let anchorX = 0;
                    let anchorY = 0;

                    const lineTarget = calloutTarget.tagName === 'g'
                        ? calloutTarget.querySelector('line, path')
                        : calloutTarget;

                    if (lineTarget?.tagName === 'line') {
                        const x1 = parseFloat(lineTarget.getAttribute('x1'));
                        const y1 = parseFloat(lineTarget.getAttribute('y1'));
                        const x2 = parseFloat(lineTarget.getAttribute('x2'));
                        const y2 = parseFloat(lineTarget.getAttribute('y2'));
                        anchorX = (x1 + x2) / 2;
                        anchorY = (y1 + y2) / 2;
                    } else if (lineTarget?.tagName === 'path' && lineTarget.getTotalLength) {
                        const length = lineTarget.getTotalLength();
                        const point = lineTarget.getPointAtLength(length / 2);
                        anchorX = point.x;
                        anchorY = point.y;
                    } else if (calloutTarget.getBBox) {
                        const bbox = calloutTarget.getBBox();
                        anchorX = bbox.x + bbox.width / 2;
                        anchorY = bbox.y + bbox.height / 2;
                    }

                    const labelId = action.id || `callout-${action.target || 'step'}`;
                    const existing = this.labels.get(labelId);
                    if (existing && existing.element?.parentNode) {
                        existing.element.parentNode.removeChild(existing.element);
                        this.labels.delete(labelId);
                    }

                    const calloutEl = this.addLabel(labelId, {
                        x: anchorX + offset[0],
                        y: anchorY + offset[1],
                        text: action.text || '',
                        width: action.width || 'auto'
                    });

                    this.timeline.to(calloutEl, {
                        opacity: 1,
                        duration: duration || 0.4,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                // v2.4: New Animation Types
                case 'rotate':
                    this.timeline.to(target, {
                        rotation: action.angle || 360,
                        transformOrigin: 'center center',
                        duration,
                        ease: action.ease || 'power1.inOut',
                        delay
                    }, action.position || label);
                    break;

                case 'bounce':
                    this.timeline.to(target, {
                        y: action.distance || -20,
                        duration: duration / 2,
                        ease: 'power2.out',
                        delay,
                        repeat: action.repeat || 2,
                        yoyo: true
                    }, action.position || label);
                    break;

                case 'shake':
                    this.timeline.to(target, {
                        x: action.intensity || 5,
                        duration: 0.05,
                        delay,
                        repeat: action.repeat || 8,
                        yoyo: true,
                        ease: 'none'
                    }, action.position || label);
                    break;

                case 'glow':
                    const glowColor = action.color || '#6366f1';
                    this.timeline.to(target, {
                        filter: `drop-shadow(0 0 ${action.size || 10}px ${glowColor})`,
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                case 'unglow':
                    this.timeline.to(target, {
                        filter: 'none',
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                case 'blink':
                    this.timeline.to(target, {
                        opacity: 0.3,
                        duration: duration / 2 || 0.25,
                        delay,
                        repeat: action.repeat || 4,
                        yoyo: true,
                        ease: 'none'
                    }, action.position || label);
                    break;

                case 'grow':
                    this.timeline.to(target, {
                        scale: action.scale || 1.2,
                        transformOrigin: 'center center',
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;

                case 'shrink':
                    this.timeline.to(target, {
                        scale: action.scale || 0.8,
                        transformOrigin: 'center center',
                        duration,
                        ease,
                        delay
                    }, action.position || label);
                    break;
            }
        });
    }

    // Playback controls
    play() {
        this.isPlaying = true;
        this.timeline.timeScale(this.speed);
        this.timeline.play();
    }

    pause() {
        this.isPlaying = false;
        this.timeline.pause();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
        return this.isPlaying;
    }

    reset() {
        this.isPlaying = false;
        this.timeline.pause();
        this.timeline.seek(0);
        this.currentStep = 0;
        if (this.onStepChange) {
            this.onStepChange(0, this.steps[0]);
        }
    }

    goToStep(index) {
        if (index >= 0 && index < this.steps.length) {
            this.timeline.seek(`step-${index}`);
            this.currentStep = index;
            if (this.onStepChange) {
                this.onStepChange(index, this.steps[index]);
            }
        }
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.goToStep(this.currentStep + 1);
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.goToStep(this.currentStep - 1);
        }
    }

    setSpeed(speed) {
        this.speed = speed;
        this.timeline.timeScale(speed);
    }

    getProgress() {
        return {
            current: this.currentStep,
            total: this.steps.length,
            percent: this.steps.length > 0 ? (this.currentStep / (this.steps.length - 1)) * 100 : 0
        };
    }

    setLoop(enabled) {
        this.loopEnabled = enabled;
    }

    toggleLoop() {
        this.loopEnabled = !this.loopEnabled;
        return this.loopEnabled;
    }

    isLooping() {
        return this.loopEnabled;
    }
}

// =====================================================
// Utility Functions
// =====================================================

function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export { lightenColor, darkenColor };
