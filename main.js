/**
 * Flow Animation Engine - Main Application
 * Entry point that initializes the animation engine and UI
 * 
 * @version 2.2.0 - Added Save to Browser
 */

import { AnimationEngine } from './engine/core.js';
import { YAMLParser, parseYAML } from './engine/yaml-parser.js';
import { createLogger, LogLevel } from './engine/logger.js';
import { formatValidationErrors } from './engine/schema-validator.js';
import { getStorageService } from './engine/storage.js';
import { getLLMService, LLMError, LLM_ERRORS } from './engine/llm-service.js';
import jsYaml from 'js-yaml';
import scenarios from './scenarios/index.js';

// =====================================================
// Logger Setup
// =====================================================

const logger = createLogger('Main');
logger.info('Flow Animation Engine v2.0 starting...');

// =====================================================
// Application State
// =====================================================

let engine = null;
let currentScenario = null;
let currentScene = null;
let currentSceneIndex = 0;
let isPlaying = false;
let yamlParser = null;
let storageService = null;  // v2.2
let currentYAMLContent = '';
let validationDebounceTimer = null;

// DOM Elements
const elements = {
    scenarioSelect: null,
    btnPlay: null,
    btnPause: null,
    btnReset: null,
    btnPrev: null,
    btnNext: null,
    iconPlay: null,
    iconPause: null,
    speedSlider: null,
    speedValue: null,
    progressFill: null,
    progressText: null,
    scenarioInfo: null,
    stepInfo: null,
    stepsTimeline: null,
    scenesList: null,
    // YAML Editor elements
    btnYamlEditor: null,
    btnUpload: null,
    fileInput: null,
    yamlModal: null,
    yamlEditor: null,
    btnApplyYaml: null,
    btnCancelYaml: null,
    btnCloseModal: null,
    btnLoadExample: null,
    btnDownloadYaml: null,
    validationStatus: null,
    validationOutput: null,
    parsedSummary: null,
    editorLineInfo: null,
    errorBanner: null,
    errorMessage: null,
    summaryComponents: null,
    summaryConnections: null,
    summarySteps: null,
    // v2.1: Loop controls
    btnLoop: null,
    iconLoopOff: null,
    iconLoopOn: null,
    // v2.2: Draft controls
    btnSaveDraft: null,
    btnLoadDraft: null,
    draftsDropdown: null,
    draftsList: null,
    // v2.3: Shortcuts modal
    shortcutsModal: null,
    btnCloseShortcuts: null,
    btnHelp: null,
    // v2.5: Export PNG
    btnExportPng: null,
    // v2.6: Embed modal
    embedModal: null,
    btnCloseEmbed: null,
    btnShare: null,
    embedIframeCode: null,
    embedUrlCode: null,
    btnCopyIframe: null,
    btnCopyUrl: null,
    // v2.8: Sidebar toggle
    btnToggleSidebar: null,
    componentPalette: null,
    // v3.0: AI Integration
    btnAiGenerate: null,
    aiModal: null,
    btnCloseAi: null,
    aiApiKey: null,
    btnToggleKey: null,
    aiPrompt: null,
    aiCharCount: null,
    aiError: null,
    aiErrorMessage: null,
    aiLoading: null,
    btnCancelAi: null,
    btnCancelAiModal: null,
    btnGenerateAi: null,
    btnAddScene: null,
    btnZoomFit: null,
    btnViewReset: null,
    btnScenePrev: null,
    btnSceneNext: null,
    sceneCount: null,
    btnNewScenario: null
};

// =====================================================
// Initialization
// =====================================================

function init() {
    logger.time('Initialization');

    // Cache DOM elements
    cacheElements();

    // Initialize YAML Parser
    yamlParser = new YAMLParser({
        validateSchema: true,
        resolveConnections: true,
        strictMode: false
    });

    // Initialize animation engine
    engine = new AnimationEngine('animation-stage');

    // Setup callbacks
    engine.onStepChange = handleStepChange;
    engine.onComplete = handleComplete;
    engine.onLoopRestart = handleLoopRestart;

    // Populate scenario dropdown
    populateScenarios();

    // Setup event listeners
    setupEventListeners();

    // Setup drag and drop for component palette
    setupDragAndDrop();

    // Setup YAML editor
    setupYAMLEditor();

    // v2.2: Initialize storage service
    storageService = getStorageService();

    // v2.3: Setup shortcuts modal
    setupShortcutsModal();

    // v2.5: Setup export button
    setupExportPNG();

    // v2.6: Setup embed modal
    setupEmbedModal();

    // v2.8: Setup sidebar toggle
    setupSidebarToggle();

    // v2.10: Setup zoom controls
    setupZoomControls();

    logger.timeEnd('Initialization');
    logger.info('Flow Animation Engine initialized successfully');
}

function cacheElements() {
    elements.scenarioSelect = document.getElementById('scenario-select');
    elements.btnPlay = document.getElementById('btn-play');
    elements.btnReset = document.getElementById('btn-reset');
    elements.btnPrev = document.getElementById('btn-prev');
    elements.btnNext = document.getElementById('btn-next');
    elements.iconPlay = document.getElementById('icon-play');
    elements.iconPause = document.getElementById('icon-pause');
    elements.speedSlider = document.getElementById('speed-slider');
    elements.speedValue = document.getElementById('speed-value');
    elements.progressFill = document.getElementById('progress-fill');
    elements.progressText = document.getElementById('progress-text');
    elements.scenarioInfo = document.getElementById('scenario-info');
    elements.stepInfo = document.getElementById('step-info');
    elements.stepsTimeline = document.getElementById('steps-timeline');
    elements.scenesList = document.getElementById('scenes-list');

    // YAML Editor elements
    elements.btnYamlEditor = document.getElementById('btn-yaml-editor');
    elements.btnUpload = document.getElementById('btn-upload');
    elements.fileInput = document.getElementById('file-input');
    elements.yamlModal = document.getElementById('yaml-editor-modal');
    elements.yamlEditor = document.getElementById('yaml-editor');
    elements.btnApplyYaml = document.getElementById('btn-apply-yaml');
    elements.btnCancelYaml = document.getElementById('btn-cancel-yaml');
    elements.btnCloseModal = document.getElementById('btn-close-modal');
    elements.btnLoadExample = document.getElementById('btn-load-example');
    elements.btnDownloadYaml = document.getElementById('btn-download-yaml');
    elements.validationStatus = document.getElementById('validation-status');
    elements.validationOutput = document.getElementById('validation-output');
    elements.parsedSummary = document.getElementById('parsed-summary');
    elements.editorLineInfo = document.getElementById('editor-line-info');
    elements.errorBanner = document.getElementById('error-banner');
    elements.errorMessage = document.getElementById('error-message');
    elements.summaryComponents = document.getElementById('summary-components');
    elements.summaryConnections = document.getElementById('summary-connections');
    elements.summarySteps = document.getElementById('summary-steps');

    // v2.1: Loop controls
    elements.btnLoop = document.getElementById('btn-loop');
    elements.iconLoopOff = document.getElementById('icon-loop-off');
    elements.iconLoopOn = document.getElementById('icon-loop-on');

    // v2.2: Draft controls
    elements.btnSaveDraft = document.getElementById('btn-save-draft');
    elements.btnLoadDraft = document.getElementById('btn-load-draft');
    elements.draftsDropdown = document.getElementById('drafts-dropdown');
    elements.draftsList = document.getElementById('drafts-list');

    // v2.3: Shortcuts modal
    elements.shortcutsModal = document.getElementById('shortcuts-modal');
    elements.btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
    elements.btnHelp = document.getElementById('btn-help');

    // v2.5: Export PNG
    elements.btnExportPng = document.getElementById('btn-export-png');

    // v2.6: Embed modal
    elements.embedModal = document.getElementById('embed-modal');
    elements.btnCloseEmbed = document.getElementById('btn-close-embed');
    elements.btnShare = document.getElementById('btn-share');
    elements.embedIframeCode = document.getElementById('embed-iframe-code');
    elements.embedUrlCode = document.getElementById('embed-url-code');
    elements.btnCopyIframe = document.getElementById('btn-copy-iframe');
    elements.btnCopyUrl = document.getElementById('btn-copy-url');

    // v2.8: Sidebar toggle
    elements.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    elements.componentPalette = document.getElementById('component-palette');
    elements.btnZoomFit = document.getElementById('btn-zoom-fit');
    elements.btnViewReset = document.getElementById('btn-zoom-reset');
    elements.btnScenePrev = document.getElementById('btn-scene-prev');
    elements.btnSceneNext = document.getElementById('btn-scene-next');
    elements.sceneCount = document.getElementById('scene-count');

    // v3.0: AI Integration
    elements.btnAiGenerate = document.getElementById('btn-ai-generate');
    elements.aiModal = document.getElementById('ai-modal');
    elements.btnCloseAi = document.getElementById('btn-close-ai');
    elements.aiApiKey = document.getElementById('ai-api-key');
    elements.btnToggleKey = document.getElementById('btn-toggle-key');
    elements.aiPrompt = document.getElementById('ai-prompt');
    elements.aiCharCount = document.getElementById('ai-char-count');
    elements.aiError = document.getElementById('ai-error');
    elements.aiErrorMessage = document.getElementById('ai-error-message');
    elements.aiLoading = document.getElementById('ai-loading');
    elements.btnCancelAi = document.getElementById('btn-cancel-ai');
    elements.btnCancelAiModal = document.getElementById('btn-cancel-ai-modal');
    elements.btnGenerateAi = document.getElementById('btn-generate-ai');
    elements.btnAddScene = document.getElementById('btn-add-scene');
    elements.btnNewScenario = document.getElementById('btn-new-scenario');
}

// =====================================================
// Scenario Management
// =====================================================

function populateScenarios() {
    // Group scenarios by category
    const grouped = scenarios.reduce((acc, scenario) => {
        const cat = scenario.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(scenario);
        return acc;
    }, {});

    // Build options
    let html = '<option value="">Select a Scenario...</option>';

    Object.keys(grouped).forEach(category => {
        html += `<optgroup label="${category}">`;
        grouped[category].forEach(scenario => {
            html += `<option value="${scenario.id}">${scenario.name}</option>`;
        });
        html += '</optgroup>';
    });

    elements.scenarioSelect.innerHTML = html;
}

function getSceneData(scenarioData, sceneIndex) {
    if (!scenarioData?.scenes || scenarioData.scenes.length === 0) return scenarioData;
    return scenarioData.scenes[Math.min(sceneIndex, scenarioData.scenes.length - 1)];
}

function getComponentBounds(comp) {
    const type = comp.type || 'rectangle';
    const centeredTypes = new Set(['circle', 'diamond', 'hexagon', 'user', 'database', 'gear', 'server']);
    let width = comp.width || 0;
    let height = comp.height || 0;

    if (Array.isArray(comp.size)) {
        [width, height] = comp.size;
    } else if (typeof comp.size === 'number') {
        const sizeTypes = ['hexagon', 'diamond', 'gear'];
        if (sizeTypes.includes(type)) {
            width = comp.size * 2;
            height = comp.size * 2;
        } else if (type === 'circle') {
            width = comp.size * 2;
            height = comp.size * 2;
        } else if (['server', 'database', 'user'].includes(type)) {
            width = 60 * comp.size;
            height = 80 * comp.size;
        } else {
            width = comp.size;
            height = comp.size;
        }
    } else {
        if (type === 'circle' && comp.radius) {
            width = comp.radius * 2;
            height = comp.radius * 2;
        } else if (['server', 'database', 'user'].includes(type)) {
            width = 60 * (comp.size || 1);
            height = 80 * (comp.size || 1);
        } else if (type === 'gear') {
            width = (comp.size || 30) * 2;
            height = (comp.size || 30) * 2;
        } else if (type === 'hexagon' || type === 'diamond') {
            width = (comp.size || 40) * 2;
            height = (comp.size || 40) * 2;
        }
    }

    if (!width) width = 120;
    if (!height) height = 60;

    const x = comp.x ?? (Array.isArray(comp.position) ? comp.position[0] : comp.position?.x) ?? 0;
    const y = comp.y ?? (Array.isArray(comp.position) ? comp.position[1] : comp.position?.y) ?? 0;

    if (centeredTypes.has(type)) {
        return { x: x - width / 2, y: y - height / 2, width, height };
    }
    return { x, y, width, height };
}

function calculateStageBounds(scene) {
    const padding = 80;
    let maxX = 0;
    let maxY = 0;

    (scene.zones || []).forEach(zone => {
        maxX = Math.max(maxX, (zone.x || 0) + (zone.width || 0));
        maxY = Math.max(maxY, (zone.y || 0) + (zone.height || 0));
    });

    (scene.components || []).forEach(comp => {
        const bounds = getComponentBounds(comp);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    return {
        width: Math.max(900, Math.ceil(maxX + padding)),
        height: Math.max(500, Math.ceil(maxY + padding))
    };
}

function renderScenesList(scenarioData) {
    if (!elements.scenesList) return;
    if (!scenarioData?.scenes || scenarioData.scenes.length === 0) {
        elements.scenesList.innerHTML = '<p class="placeholder-text">No scenes loaded</p>';
        if (elements.sceneCount) elements.sceneCount.textContent = '0 / 0';
        return;
    }

    let html = '';
    scenarioData.scenes.forEach((scene, index) => {
        const activeClass = index === currentSceneIndex ? ' active' : '';
        html += `
            <div class="scene-item${activeClass}" data-scene="${index}">
                <span class="scene-indicator"></span>
                <span class="scene-name">${scene.name || `Scene ${index + 1}`}</span>
                <div class="scene-actions">
                    <button class="scene-action-btn duplicate" data-index="${index}" title="Duplicate Scene">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    </button>
                    <button class="scene-action-btn delete" data-index="${index}" title="Delete Scene">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });

    elements.scenesList.innerHTML = html;

    // Click to select scene
    elements.scenesList.querySelectorAll('.scene-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Ignore if clicking action buttons
            if (e.target.closest('.scene-action-btn')) return;
            const index = parseInt(item.dataset.scene, 10);
            loadScenario(scenarioData, index);
        });
    });

    // Duplicate scene handler
    elements.scenesList.querySelectorAll('.scene-action-btn.duplicate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index, 10);
            duplicateScene(index);
        });
    });

    // Delete scene handler
    elements.scenesList.querySelectorAll('.scene-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index, 10);
            deleteScene(index);
        });
    });

    if (elements.sceneCount) {
        elements.sceneCount.textContent = `${currentSceneIndex + 1} / ${scenarioData.scenes.length}`;
    }
}

// Duplicate a scene
function duplicateScene(index) {
    if (!currentScenario?.scenes || index >= currentScenario.scenes.length) return;

    const original = currentScenario.scenes[index];
    const duplicate = JSON.parse(JSON.stringify(original)); // Deep copy
    duplicate.name = `${original.name || 'Scene'} (Copy)`;

    // Insert after the original
    currentScenario.scenes.splice(index + 1, 0, duplicate);

    // Re-render and switch to duplicate
    renderScenesList(currentScenario);
    loadScenario(currentScenario, index + 1);
    showToast(`Scene duplicated: "${duplicate.name}"`);
    logger.info('Scene duplicated', { index, newIndex: index + 1 });
}

// Delete a scene
function deleteScene(index) {
    if (!currentScenario?.scenes || currentScenario.scenes.length <= 1) {
        showToast('Cannot delete the only scene');
        return;
    }

    const sceneName = currentScenario.scenes[index]?.name || `Scene ${index + 1}`;

    if (!confirm(`Delete "${sceneName}"? This cannot be undone.`)) {
        return;
    }

    currentScenario.scenes.splice(index, 1);

    // Adjust current index if needed
    let newIndex = currentSceneIndex;
    if (index <= currentSceneIndex) {
        newIndex = Math.max(0, currentSceneIndex - 1);
    }

    renderScenesList(currentScenario);
    loadScenario(currentScenario, newIndex);
    showToast(`Scene deleted: "${sceneName}"`);
    logger.info('Scene deleted', { index, sceneName });
}


function loadScenario(scenarioData, sceneIndex = 0) {
    logger.info('Loading scenario', { name: scenarioData.name, sceneIndex });

    currentScenario = scenarioData;
    currentSceneIndex = sceneIndex;
    currentScene = getSceneData(scenarioData, sceneIndex);
    engine.clear();

    // v2.9: Update SVG dimensions for horizontal scroll if layout calculated bounds
    const stage = document.getElementById('animation-stage');
    if (currentScene?._stageWidth || currentScene?._stageHeight) {
        const width = currentScene._stageWidth || 900;
        const height = currentScene._stageHeight || 500;
        stage.setAttribute('viewBox', `0 0 ${width} ${height}`);
        stage.style.width = `${width}px`;
        stage.style.minWidth = `${width}px`;
        logger.info('Updated stage dimensions', { width, height });
    } else if (currentScene) {
        const bounds = calculateStageBounds(currentScene);
        stage.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
        stage.style.width = `${bounds.width}px`;
        stage.style.minWidth = `${bounds.width}px`;
        logger.info('Auto-fit stage dimensions', bounds);
    }
    const viewport = stage?.querySelector('#stage-viewport');
    if (viewport) {
        applyZoom(stage, viewport);
    }

    // Update scenario info
    const scenarioTitle = scenarioData.scenes && currentScene?.name
        ? `${scenarioData.name} — ${currentScene.name}`
        : scenarioData.name;
    elements.scenarioInfo.innerHTML = `
        <h4 style="margin-bottom: 8px; color: var(--text-primary);">${scenarioTitle}</h4>
        <p>${currentScene?.description || scenarioData.description}</p>
    `;

    // Add zones first (they go behind everything)
    if (currentScene?.zones) {
        currentScene.zones.forEach(zone => {
            engine.addZone(zone.id, zone);
        });
    }

    // Add components
    if (currentScene?.components) {
        currentScene.components.forEach(comp => {
            engine.addComponent(comp.id, comp.type, comp);
        });
    }

    // Add connections
    if (currentScene?.connections) {
        currentScene.connections.forEach(conn => {
            engine.addConnection(conn.id, conn.type || 'arrow', conn);
        });
    }

    // Build animation timeline
    engine.buildTimeline(currentScene?.steps || []);

    // Render steps timeline
    renderStepsTimeline(currentScene?.steps || []);

    // Update progress
    updateProgress();

    // Reset step info
    if (currentScene?.steps && currentScene.steps.length > 0) {
        updateStepInfo(0, currentScene.steps[0]);
    }

    renderScenesList(scenarioData);

    logger.info('Scenario loaded successfully', { name: scenarioData.name });
}

function loadScenarioById(scenarioId) {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
        logger.error('Scenario not found', { id: scenarioId });
        return;
    }
    loadScenario(scenario);
}

function goToScene(offset) {
    if (!currentScenario?.scenes || currentScenario.scenes.length === 0) return;
    const nextIndex = Math.max(0, Math.min(currentSceneIndex + offset, currentScenario.scenes.length - 1));
    if (nextIndex === currentSceneIndex) return;
    loadScenario(currentScenario, nextIndex);
}

function renderStepsTimeline(steps) {
    if (!elements.stepsTimeline) return;

    let html = '';
    steps.forEach((step, index) => {
        html += `
            <div class="timeline-step${index === 0 ? ' active' : ''}" data-step="${index}">
                <span class="timeline-step-num">${index + 1}</span>
                <span class="timeline-step-title">${step.title}</span>
            </div>
        `;
    });

    elements.stepsTimeline.innerHTML = html;

    // Add click handlers
    elements.stepsTimeline.querySelectorAll('.timeline-step').forEach(el => {
        el.addEventListener('click', () => {
            const step = parseInt(el.dataset.step);
            engine.goToStep(step);
        });
    });
}

// =====================================================
// YAML Editor
// =====================================================

function setupYAMLEditor() {
    logger.debug('Setting up YAML editor');

    // Open editor button
    elements.btnYamlEditor?.addEventListener('click', openYAMLEditor);

    // Upload button
    elements.btnUpload?.addEventListener('click', () => elements.fileInput?.click());

    // File input change
    elements.fileInput?.addEventListener('change', handleFileUpload);

    // Modal controls
    elements.btnCloseModal?.addEventListener('click', closeYAMLEditor);
    elements.btnCancelYaml?.addEventListener('click', closeYAMLEditor);
    elements.btnApplyYaml?.addEventListener('click', applyYAML);
    elements.btnLoadExample?.addEventListener('click', loadExampleYAML);
    elements.btnDownloadYaml?.addEventListener('click', downloadYAML);

    // v2.2: Draft buttons
    elements.btnSaveDraft?.addEventListener('click', saveDraft);
    elements.btnLoadDraft?.addEventListener('click', toggleDraftsDropdown);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown-container')) {
            closeDraftsDropdown();
        }
    });

    // Editor input with debounce
    elements.yamlEditor?.addEventListener('input', debounceValidation);

    // Editor cursor position
    elements.yamlEditor?.addEventListener('click', updateCursorPosition);
    elements.yamlEditor?.addEventListener('keyup', updateCursorPosition);

    // Handle tab key for indentation
    elements.yamlEditor?.addEventListener('keydown', handleEditorKeydown);

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.yamlModal?.style.display !== 'none') {
            closeYAMLEditor();
        }
    });

    // Close on overlay click
    elements.yamlModal?.addEventListener('click', (e) => {
        if (e.target === elements.yamlModal) {
            closeYAMLEditor();
        }
    });
}

function openYAMLEditor() {
    logger.debug('Opening YAML editor');
    elements.yamlModal.style.display = 'flex';
    elements.yamlEditor.focus();

    // If there's content, validate it
    if (elements.yamlEditor.value.trim()) {
        validateYAMLContent();
    }
}

function closeYAMLEditor() {
    logger.debug('Closing YAML editor');
    elements.yamlModal.style.display = 'none';
    hideError();
}

function handleEditorKeydown(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        const value = e.target.value;

        // Insert 2 spaces for tab
        e.target.value = value.substring(0, start) + '  ' + value.substring(end);
        e.target.selectionStart = e.target.selectionEnd = start + 2;

        // Trigger validation
        debounceValidation();
    }
}

function updateCursorPosition() {
    if (!elements.yamlEditor || !elements.editorLineInfo) return;

    const text = elements.yamlEditor.value;
    const pos = elements.yamlEditor.selectionStart;

    // Count lines and column
    const lines = text.substring(0, pos).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;

    elements.editorLineInfo.textContent = `Ln ${line}, Col ${col}`;
}

function debounceValidation() {
    clearTimeout(validationDebounceTimer);
    validationDebounceTimer = setTimeout(validateYAMLContent, 300);
}

function validateYAMLContent() {
    const content = elements.yamlEditor.value.trim();

    if (!content) {
        resetValidationUI();
        return;
    }

    try {
        logger.debug('Validating YAML content');
        const parsed = yamlParser.parse(content);

        // Success!
        showValidationSuccess(parsed);
        hideError();

    } catch (error) {
        logger.warn('YAML validation failed', error);
        showValidationError(error);
    }
}

function resetValidationUI() {
    elements.validationStatus.textContent = '✓ Valid';
    elements.validationStatus.className = 'validation-badge valid';
    elements.validationOutput.innerHTML = `
        <div class="validation-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12" y2="8"/>
            </svg>
            <p>Write or paste YAML to validate</p>
        </div>
    `;
    elements.parsedSummary.style.display = 'none';
}

function showValidationSuccess(parsed) {
    elements.validationStatus.textContent = '✓ Valid';
    elements.validationStatus.className = 'validation-badge valid';

    // Re-enable Apply button
    enableApplyButton();

    elements.validationOutput.innerHTML = `
        <div class="validation-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>YAML is valid and ready to play!</span>
        </div>
    `;

    // Update summary
    elements.parsedSummary.style.display = 'block';
    if (parsed.scenes && Array.isArray(parsed.scenes)) {
        const totals = parsed.scenes.reduce((acc, scene) => {
            acc.components += scene.components?.length || 0;
            acc.connections += scene.connections?.length || 0;
            acc.steps += scene.steps?.length || 0;
            return acc;
        }, { components: 0, connections: 0, steps: 0 });
        elements.summaryComponents.textContent = totals.components;
        elements.summaryConnections.textContent = totals.connections;
        elements.summarySteps.textContent = totals.steps;
    } else {
        elements.summaryComponents.textContent = parsed.components?.length || 0;
        elements.summaryConnections.textContent = parsed.connections?.length || 0;
        elements.summarySteps.textContent = parsed.steps?.length || 0;
    }
}

function showValidationError(error) {
    elements.validationStatus.textContent = '✗ Error';
    elements.validationStatus.className = 'validation-badge invalid';

    // Disable Apply button when invalid
    if (elements.btnApplyYaml) {
        elements.btnApplyYaml.disabled = true;
    }

    // Mark editor as having error
    if (elements.yamlEditor) {
        elements.yamlEditor.classList.add('has-error');
    }

    let errorHtml = '';
    const lineNum = error.line || null;

    if (lineNum) {
        errorHtml = `
            <div class="yaml-error-banner" onclick="scrollToErrorLine(${lineNum})" title="Click to go to error line">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>${error.message}</span>
                <span class="error-line">Line ${lineNum}</span>
            </div>
        `;
    } else {
        errorHtml = `
            <div class="validation-error">
                ${error.message}
            </div>
        `;
    }

    elements.validationOutput.innerHTML = errorHtml;
    elements.parsedSummary.style.display = 'none';
}

// Scroll to error line in YAML editor
window.scrollToErrorLine = function (lineNum) {
    if (!elements.yamlEditor) return;

    const lines = elements.yamlEditor.value.split('\n');
    let pos = 0;
    for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
        pos += lines[i].length + 1;
    }

    elements.yamlEditor.focus();
    elements.yamlEditor.setSelectionRange(pos, pos + (lines[lineNum - 1]?.length || 0));

    // Scroll into view
    const lineHeight = 20;
    elements.yamlEditor.scrollTop = (lineNum - 5) * lineHeight;
};

// Re-enable Apply when valid
function enableApplyButton() {
    if (elements.btnApplyYaml) {
        elements.btnApplyYaml.disabled = false;
    }
    if (elements.yamlEditor) {
        elements.yamlEditor.classList.remove('has-error');
    }
}


function showError(message) {
    elements.errorBanner.style.display = 'flex';
    elements.errorMessage.textContent = message;
}

function hideError() {
    elements.errorBanner.style.display = 'none';
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    logger.info('Uploading file', { name: file.name });

    try {
        const content = await file.text();
        elements.yamlEditor.value = content;
        openYAMLEditor();
        validateYAMLContent();
    } catch (error) {
        logger.error('File upload failed', error);
        showError('Failed to read file: ' + error.message);
    }

    // Reset file input
    e.target.value = '';
}

function applyYAML() {
    const content = elements.yamlEditor.value.trim();

    if (!content) {
        showError('Please enter YAML content');
        return;
    }

    try {
        logger.info('Applying YAML scenario');
        const parsed = yamlParser.parse(content);

        // Close modal
        closeYAMLEditor();

        // Load the parsed scenario
        loadScenario(parsed);

        // Clear the dropdown selection since this is a custom scenario
        elements.scenarioSelect.value = '';

        // Auto-play
        setTimeout(() => {
            isPlaying = engine.togglePlay();
            updatePlayButton();
        }, 500);

        logger.info('Custom YAML scenario applied successfully');

    } catch (error) {
        logger.error('Failed to apply YAML', error);
        showError(error.message);
    }
}

function loadExampleYAML() {
    logger.debug('Loading example YAML');

    const exampleYAML = `# Kubernetes Control Plane Flow
# This example shows how kubectl commands flow through the control plane

name: Kubernetes Control Plane
description: How kubectl commands flow through the Kubernetes control plane
category: Kubernetes

zones:
  - id: control-plane
    label: CONTROL PLANE
    position: [50, 50]
    size: [500, 300]
    color: "#6366f1"

  - id: worker-nodes
    label: WORKER NODES
    position: [600, 50]
    size: [550, 600]
    color: "#10b981"

components:
  # Control Plane Components
  - id: user
    type: user
    position: [100, 450]
    label: kubectl

  - id: api-server
    type: rectangle
    position: [150, 150]
    size: [120, 50]
    color: "#6366f1"
    label: API Server

  - id: etcd
    type: cylinder
    position: [350, 100]
    size: [80, 100]
    color: "#ef4444"
    label: etcd

  - id: scheduler
    type: hexagon
    position: [200, 280]
    size: 35
    color: "#f59e0b"
    label: Scheduler

  # Worker Node Components
  - id: node1
    type: server
    position: [700, 150]
    label: Node 1

  - id: pod1
    type: hexagon
    position: [700, 350]
    size: 25
    color: "#326CE5"
    label: Pod

connections:
  - id: user-to-api
    from: user
    to: api-server
    type: arrow
    color: "#6366f1"

  - id: api-to-etcd
    from: api-server
    to: etcd
    type: arrow
    color: "#ef4444"

  - id: api-to-scheduler
    from: api-server
    to: scheduler
    type: arrow
    color: "#f59e0b"

  - id: node-to-pod
    from: node1
    to: pod1
    type: arrow
    color: "#326CE5"

steps:
  - title: User sends kubectl command
    description: User runs kubectl apply to create a Deployment
    animate:
      - fadeIn: user
      - fadeIn: control-plane
      - fadeIn: api-server
        delay: 0.3

  - title: API Server receives request
    description: API Server authenticates and validates the request
    animate:
      - fadeIn: user-to-api
      - drawLine: user-to-api
        duration: 0.8
      - pulse: api-server

  - title: State persisted to etcd
    description: API Server writes the desired state to etcd
    animate:
      - fadeIn: etcd
      - fadeIn: api-to-etcd
      - drawLine: api-to-etcd
        duration: 0.6
      - pulse: etcd

  - title: Scheduler assigns Pod
    description: Scheduler detects new Pod and assigns to Node
    animate:
      - fadeIn: scheduler
      - fadeIn: api-to-scheduler
      - fadeIn: worker-nodes
      - fadeIn: node1
        delay: 0.3

  - title: Pod is created
    description: Kubelet creates the container on the node
    animate:
      - fadeIn: node-to-pod
      - drawLine: node-to-pod
      - fadeIn: pod1
      - highlight: pod1
        color: "#10b981"

  - title: Deployment Complete!
    description: Pod is running and ready to serve traffic
    animate:
      - color: pod1
        to: "#10b981"
`;

    elements.yamlEditor.value = exampleYAML;
    validateYAMLContent();
}

function downloadYAML() {
    const content = elements.yamlEditor.value;

    if (!content.trim()) {
        showError('No content to download');
        return;
    }

    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenario.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.info('YAML downloaded');
}

// =====================================================
// v2.2: Draft Management
// =====================================================

function saveDraft() {
    const content = elements.yamlEditor.value.trim();

    if (!content) {
        showError('No content to save');
        return;
    }

    // Try to get name from YAML
    let name = 'Untitled Draft';
    try {
        const match = content.match(/name:\s*['"]*([^'"\\n]+)/);
        if (match) {
            name = match[1].trim();
        }
    } catch (e) { }

    // Prompt for name
    const finalName = prompt('Enter draft name:', name);
    if (!finalName) return;

    const draft = storageService.saveDraft(finalName, content);
    if (draft) {
        showToast('Draft saved!');
        logger.info(`Draft saved: ${finalName}`);
    } else {
        showError('Failed to save draft');
    }
}

function toggleDraftsDropdown() {
    const dropdown = elements.draftsDropdown;
    if (!dropdown) return;

    const isOpen = dropdown.style.display !== 'none';

    if (isOpen) {
        dropdown.style.display = 'none';
    } else {
        renderDraftsList();
        dropdown.style.display = 'block';
    }
}

function closeDraftsDropdown() {
    if (elements.draftsDropdown) {
        elements.draftsDropdown.style.display = 'none';
    }
}

function renderDraftsList() {
    if (!elements.draftsList) return;

    const drafts = storageService.getDrafts();

    if (drafts.length === 0) {
        elements.draftsList.innerHTML = '<div class="empty-drafts">No saved drafts</div>';
        return;
    }

    let html = '';
    drafts.forEach(draft => {
        const date = new Date(draft.savedAt);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        html += `
            <div class="draft-item" data-id="${draft.id}">
                <div class="draft-item-info">
                    <div class="draft-item-name">${escapeHtml(draft.name)}</div>
                    <div class="draft-item-meta">${dateStr}</div>
                </div>
                <button class="draft-item-delete" data-id="${draft.id}" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `;
    });

    elements.draftsList.innerHTML = html;

    // Add click handlers
    elements.draftsList.querySelectorAll('.draft-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.draft-item-delete')) return;
            loadDraft(el.dataset.id);
        });
    });

    elements.draftsList.querySelectorAll('.draft-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteDraft(btn.dataset.id);
        });
    });
}

function loadDraft(id) {
    const draft = storageService.getDraft(id);
    if (!draft) {
        showError('Draft not found');
        return;
    }

    elements.yamlEditor.value = draft.content;
    closeDraftsDropdown();
    validateYAMLContent();
    logger.info(`Loaded draft: ${draft.name}`);
}

function deleteDraft(id) {
    if (!confirm('Delete this draft?')) return;

    const success = storageService.deleteDraft(id);
    if (success) {
        renderDraftsList();
        showToast('Draft deleted');
    }
}

function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.save-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'save-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2500);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =====================================================
// v2.3: Shortcuts Modal
// =====================================================

function toggleShortcutsModal() {
    if (!elements.shortcutsModal) return;

    const isOpen = elements.shortcutsModal.style.display !== 'none';
    elements.shortcutsModal.style.display = isOpen ? 'none' : 'flex';
}

function closeShortcutsModal() {
    if (elements.shortcutsModal) {
        elements.shortcutsModal.style.display = 'none';
    }
}

function setupShortcutsModal() {
    elements.btnHelp?.addEventListener('click', toggleShortcutsModal);
    elements.btnCloseShortcuts?.addEventListener('click', closeShortcutsModal);

    // Close on overlay click
    elements.shortcutsModal?.addEventListener('click', (e) => {
        if (e.target === elements.shortcutsModal) {
            closeShortcutsModal();
        }
    });
}

// =====================================================
// v2.5: Export as PNG
// =====================================================

function setupExportPNG() {
    elements.btnExportPng?.addEventListener('click', exportAsPNG);
}

async function exportAsPNG() {
    const svg = document.getElementById('animation-stage');
    if (!svg) {
        showError('No animation stage found');
        return;
    }

    try {
        logger.info('Exporting SVG as PNG...');
        showToast('Exporting PNG...');

        // Get SVG dimensions
        const svgRect = svg.getBoundingClientRect();
        const width = svgRect.width;
        const height = svgRect.height;

        // Clone SVG and add styles inline
        const svgClone = svg.cloneNode(true);

        // Add computed styles to clone
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .shape-body { stroke-width: 2; }
            text { font-family: 'Inter', sans-serif; }
        `;
        svgClone.insertBefore(styleElement, svgClone.firstChild);

        // Convert to data URL
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        // Create image
        const img = new Image();
        img.onload = () => {
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = width * 2; // 2x for retina
            canvas.height = height * 2;

            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2);

            // Draw dark background
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, width, height);

            // Draw SVG
            ctx.drawImage(img, 0, 0, width, height);

            // Export as PNG
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `flow-animation-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                URL.revokeObjectURL(svgUrl);

                logger.info('PNG exported successfully');
                showToast('PNG exported!');
            }, 'image/png');
        };

        img.onerror = () => {
            logger.error('Failed to load SVG for export');
            showError('Export failed');
        };

        img.src = svgUrl;

    } catch (error) {
        logger.error('Export failed', error);
        showError('Export failed: ' + error.message);
    }
}

// =====================================================
// v2.8: Sidebar Toggle
// =====================================================

function setupSidebarToggle() {
    elements.btnToggleSidebar?.addEventListener('click', toggleSidebar);
}

function toggleSidebar() {
    if (elements.componentPalette) {
        elements.componentPalette.classList.toggle('collapsed');
        logger.info('Sidebar toggled', {
            collapsed: elements.componentPalette.classList.contains('collapsed')
        });
    }
}

// =====================================================
// v2.10: Zoom Controls
// =====================================================

let currentZoom = 1;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const ZOOM_WHEEL_FACTOR = 0.0018;
let isPanning = false;
let panMode = false;
let panStartX = 0;
let panStartY = 0;
let panOffsetX = 0;
let panOffsetY = 0;
let panStartOffsetX = 0;
let panStartOffsetY = 0;

function setupZoomControls() {
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomReset = document.getElementById('btn-zoom-reset');
    const btnZoomFit = document.getElementById('btn-zoom-fit');
    const stage = document.getElementById('animation-stage');
    const viewport = stage?.querySelector('#stage-viewport');
    const wrapper = document.querySelector('.stage-wrapper');

    btnZoomIn?.addEventListener('click', () => {
        zoomIn(stage, viewport);
    });
    btnZoomOut?.addEventListener('click', () => {
        zoomOut(stage, viewport);
    });
    btnZoomReset?.addEventListener('click', () => {
        zoomReset(stage, viewport);
    });
    btnZoomFit?.addEventListener('click', () => {
        fitToContent(stage, viewport, wrapper);
    });

    // Keyboard shortcuts for zoom
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                zoomIn(stage, viewport);
            } else if (e.key === '-') {
                e.preventDefault();
                zoomOut(stage, viewport);
            } else if (e.key === '0') {
                e.preventDefault();
                zoomReset(stage, viewport);
            }
        }

        if (e.code === 'Space' && !panMode) {
            panMode = true;
            wrapper?.classList.add('pan-active');
        }
    });

    // Mouse wheel zoom with Ctrl
    wrapper?.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * ZOOM_WHEEL_FACTOR;
            if (delta !== 0) {
                currentZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, currentZoom + delta));
                applyZoom(stage, viewport);
            }
        }
    }, { passive: false });

    const isCanvasPanTarget = (event) => {
        const blocked = event.target.closest('.zoom-controls, .drop-target-overlay, .component-item, .modal-overlay');
        return !blocked;
    };

    // Canvas panning (hold space, middle mouse, or drag on empty canvas)
    wrapper?.addEventListener('mousedown', (e) => {
        const isMiddle = e.button === 1;
        const isLeftPan = e.button === 0 && isCanvasPanTarget(e);
        if (!panMode && !isMiddle && !isLeftPan) return;
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartOffsetX = panOffsetX;
        panStartOffsetY = panOffsetY;
        wrapper.classList.add('panning');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning || !wrapper) return;
        const rect = stage.getBoundingClientRect();
        const viewBox = stage.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        const dx = (e.clientX - panStartX) * scaleX / currentZoom;
        const dy = (e.clientY - panStartY) * scaleY / currentZoom;
        panOffsetX = panStartOffsetX + dx;
        panOffsetY = panStartOffsetY + dy;
        applyZoom(stage, viewport);
    });

    window.addEventListener('mouseup', () => {
        if (!wrapper) return;
        isPanning = false;
        wrapper.classList.remove('panning');
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            panMode = false;
            wrapper?.classList.remove('pan-active');
        }
    });

    logger.info('Zoom controls initialized');
}

function zoomIn(stage, viewport) {
    if (currentZoom < ZOOM_MAX) {
        currentZoom = Math.min(ZOOM_MAX, currentZoom + ZOOM_STEP);
        applyZoom(stage, viewport);
    }
}

function zoomOut(stage, viewport) {
    if (currentZoom > ZOOM_MIN) {
        currentZoom = Math.max(ZOOM_MIN, currentZoom - ZOOM_STEP);
        applyZoom(stage, viewport);
    }
}

function zoomReset(stage, viewport) {
    currentZoom = 1;
    panOffsetX = 0;
    panOffsetY = 0;
    applyZoom(stage, viewport);
}

function applyZoom(stage, viewport) {
    if (!stage || !viewport) return;
    const viewBox = stage.viewBox.baseVal;
    const centerX = viewBox.width / 2;
    const centerY = viewBox.height / 2;
    const transform = `translate(${centerX} ${centerY}) scale(${currentZoom}) translate(${-centerX} ${-centerY}) translate(${panOffsetX} ${panOffsetY})`;
    viewport.setAttribute('transform', transform);
    stage.style.transform = '';

    const zoomLabel = document.getElementById('zoom-level');
    if (zoomLabel) {
        zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
    }

    logger.debug('Zoom applied', { zoom: currentZoom });
}

function fitToContent(stage, viewport, wrapper) {
    if (!stage || !viewport || !wrapper) return;
    const viewBox = stage.viewBox.baseVal;
    const scaleX = wrapper.clientWidth / viewBox.width;
    const scaleY = wrapper.clientHeight / viewBox.height;
    currentZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(scaleX, scaleY)));
    panOffsetX = 0;
    panOffsetY = 0;
    applyZoom(stage, viewport);
}

// =====================================================
// v2.6: Embed Code Generator
// =====================================================

function setupEmbedModal() {
    elements.btnShare?.addEventListener('click', openEmbedModal);
    elements.btnCloseEmbed?.addEventListener('click', closeEmbedModal);

    // Copy buttons
    elements.btnCopyIframe?.addEventListener('click', () => copyToClipboard('iframe'));
    elements.btnCopyUrl?.addEventListener('click', () => copyToClipboard('url'));

    // Close on overlay click
    elements.embedModal?.addEventListener('click', (e) => {
        if (e.target === elements.embedModal) {
            closeEmbedModal();
        }
    });
}

function openEmbedModal() {
    if (!elements.embedModal) return;

    // Generate embed codes
    const baseUrl = window.location.href.split('?')[0];
    const iframeCode = `<iframe src="${baseUrl}" width="800" height="600" frameborder="0" style="border-radius: 8px;"></iframe>`;

    if (elements.embedIframeCode) {
        elements.embedIframeCode.textContent = iframeCode;
    }
    if (elements.embedUrlCode) {
        elements.embedUrlCode.textContent = baseUrl;
    }

    elements.embedModal.style.display = 'flex';
    logger.info('Embed modal opened');
}

function closeEmbedModal() {
    if (elements.embedModal) {
        elements.embedModal.style.display = 'none';
    }
}

async function copyToClipboard(type) {
    let text = '';

    if (type === 'iframe' && elements.embedIframeCode) {
        text = elements.embedIframeCode.textContent;
    } else if (type === 'url' && elements.embedUrlCode) {
        text = elements.embedUrlCode.textContent;
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!');
        logger.info(`Copied ${type} to clipboard`);
    } catch (error) {
        logger.error('Failed to copy', error);
        showError('Failed to copy to clipboard');
    }
}

// =====================================================
// Event Handlers
// =====================================================

function setupEventListeners() {
    // Scenario selection
    elements.scenarioSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadScenarioById(e.target.value);
        }
    });

    // Playback controls
    elements.btnPlay.addEventListener('click', togglePlay);
    elements.btnReset.addEventListener('click', handleReset);
    elements.btnPrev.addEventListener('click', () => engine.prevStep());
    elements.btnNext.addEventListener('click', () => engine.nextStep());

    // v2.1: Loop toggle
    elements.btnLoop?.addEventListener('click', toggleLoop);

    // Speed control
    elements.speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        engine.setSpeed(speed);
        elements.speedValue.textContent = `${speed}x`;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Scene navigation
    elements.btnScenePrev?.addEventListener('click', () => goToScene(-1));
    elements.btnSceneNext?.addEventListener('click', () => goToScene(1));
}

function togglePlay() {
    if (!currentScenario) {
        alert('Please select a scenario first');
        return;
    }

    isPlaying = engine.togglePlay();
    updatePlayButton();
}

function handleReset() {
    engine.reset();
    isPlaying = false;
    updatePlayButton();
    updateProgress();
}

// v2.1: Toggle loop mode
function toggleLoop() {
    const loopEnabled = engine.toggleLoop();
    updateLoopButton(loopEnabled);
    logger.info(`Loop mode ${loopEnabled ? 'enabled' : 'disabled'}`);
}

function updateLoopButton(enabled) {
    if (!elements.btnLoop) return;

    if (enabled) {
        elements.btnLoop.classList.add('loop-active');
        elements.iconLoopOff.style.display = 'none';
        elements.iconLoopOn.style.display = 'block';
    } else {
        elements.btnLoop.classList.remove('loop-active');
        elements.iconLoopOff.style.display = 'block';
        elements.iconLoopOn.style.display = 'none';
    }
}

function handleStepChange(index, step) {
    updateStepInfo(index, step);
    updateProgress();
    updateTimelineHighlight(index);
}

function handleComplete() {
    isPlaying = false;
    updatePlayButton();
    logger.info('Animation complete');
}

// v2.1: Handle loop restart
function handleLoopRestart() {
    logger.info('Animation looping...');
    updateProgress();
    updateTimelineHighlight(0);
    if (currentScene && currentScene.steps && currentScene.steps.length > 0) {
        updateStepInfo(0, currentScene.steps[0]);
    }
}

function handleKeyboard(e) {
    // Don't handle if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    // v2.3: Show shortcuts modal on ?
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        toggleShortcutsModal();
        return;
    }

    // Check if any modal is open
    if (elements.yamlModal?.style.display !== 'none' ||
        elements.shortcutsModal?.style.display !== 'none') return;

    switch (e.key) {
        case ' ':
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowLeft':
            engine.prevStep();
            break;
        case 'ArrowRight':
            engine.nextStep();
            break;
        case 'r':
        case 'R':
            handleReset();
            break;
        case 'e':
        case 'E':
            openYAMLEditor();
            break;
        case 'l':
        case 'L':
            toggleLoop();
            break;
    }
}

// =====================================================
// UI Updates
// =====================================================

function updatePlayButton() {
    if (isPlaying) {
        elements.iconPlay.style.display = 'none';
        elements.iconPause.style.display = 'block';
    } else {
        elements.iconPlay.style.display = 'block';
        elements.iconPause.style.display = 'none';
    }
}

function updateStepInfo(index, step) {
    if (!elements.stepInfo) return;

    elements.stepInfo.innerHTML = `
        <div class="step-number">${index + 1}</div>
        <div class="step-content">
            <strong style="display: block; margin-bottom: 4px; color: var(--text-primary);">${step.title}</strong>
            <span class="step-description">${step.description}</span>
        </div>
    `;
}

function updateProgress() {
    const progress = engine.getProgress();
    const percent = progress.total > 1 ? (progress.current / (progress.total - 1)) * 100 : 0;

    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = `${progress.current + 1} / ${progress.total}`;
}

function updateTimelineHighlight(activeIndex) {
    if (!elements.stepsTimeline) return;

    elements.stepsTimeline.querySelectorAll('.timeline-step').forEach((el, index) => {
        el.classList.remove('active', 'completed');
        if (index === activeIndex) {
            el.classList.add('active');
        } else if (index < activeIndex) {
            el.classList.add('completed');
        }
    });
}

// =====================================================
// Drag and Drop (for component palette)
// =====================================================

function setupDragAndDrop() {
    const componentItems = document.querySelectorAll('.component-item');
    const stage = document.getElementById('animation-stage');
    const dropOverlay = document.getElementById('drop-target-overlay');

    componentItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.dataset.type);
            e.dataTransfer.effectAllowed = 'copy';
            // Show drop target overlay
            if (dropOverlay) dropOverlay.style.display = 'flex';
        });

        item.addEventListener('dragend', () => {
            // Hide drop target overlay
            if (dropOverlay) dropOverlay.style.display = 'none';
        });
    });

    stage.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    stage.addEventListener('dragleave', (e) => {
        // Hide overlay when leaving stage
        if (dropOverlay && !e.relatedTarget?.closest('.stage-wrapper')) {
            dropOverlay.style.display = 'none';
        }
    });

    stage.addEventListener('drop', (e) => {
        e.preventDefault();
        // Hide drop overlay
        if (dropOverlay) dropOverlay.style.display = 'none';

        const type = e.dataTransfer.getData('text/plain');

        // Get SVG coordinates
        const rect = stage.getBoundingClientRect();
        const viewBox = stage.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;
        const centerX = viewBox.width / 2;
        const centerY = viewBox.height / 2;
        x = centerX + (x - centerX) / currentZoom - panOffsetX;
        y = centerY + (y - centerY) / currentZoom - panOffsetY;

        // Add component at drop position
        const id = `dropped-${type}-${Date.now()}`;
        const element = engine.addComponent(id, type, {
            x,
            y,
            label: type.charAt(0).toUpperCase() + type.slice(1)
        });

        if (element) {
            // Animate appearance
            element.style.opacity = '0';
            import('gsap').then(({ gsap }) => {
                gsap.to(element, { opacity: 1, duration: 0.3, ease: 'power2.out' });
            });
        }

        logger.debug(`Added ${type} at (${Math.round(x)}, ${Math.round(y)})`);
    });
}


// =====================================================
// v3.0: AI Assistant Functions
// =====================================================

let llmService = null;
let aiMode = 'scenario'; // 'scenario' or 'scene'
let sceneContext = null; // Holds current scenario info when adding scenes

function initAIAssistant() {
    llmService = getLLMService();

    // Load saved API key
    if (elements.aiApiKey && llmService.hasApiKey()) {
        elements.aiApiKey.value = llmService.loadApiKey();
    }
}

/**
 * Open AI modal in scenario mode (generate full scenario)
 */
function openAIModal() {
    aiMode = 'scenario';
    sceneContext = null;

    if (elements.aiModal) {
        // Update UI for scenario mode
        updateAIModalForMode();
        elements.aiModal.style.display = 'flex';
        hideAIError();
        hideAILoading();
        elements.aiPrompt.value = '';
        elements.aiPrompt.focus();
        updateCharCount();
    }
}

/**
 * Open AI modal in scene mode (add scene to existing scenario)
 */
function openAIModalForScene() {
    // Check if a scenario is loaded
    if (!currentScenario) {
        showToast('Please load a scenario first, then add a scene.');
        openAIModal(); // Fall back to scenario mode
        return;
    }

    aiMode = 'scene';

    // Build context from current scenario
    const sceneCount = currentScenario.scenes ? currentScenario.scenes.length : 1;
    sceneContext = {
        scenario: currentScenario,
        sceneCount: sceneCount,
        scenarioName: currentScenario.name || 'Unnamed Scenario'
    };

    if (elements.aiModal) {
        // Update UI for scene mode
        updateAIModalForMode();
        elements.aiModal.style.display = 'flex';
        hideAIError();
        hideAILoading();
        elements.aiPrompt.value = '';
        elements.aiPrompt.focus();
        updateCharCount();
    }
}

/**
 * Update modal UI based on current mode
 */
function updateAIModalForMode() {
    const contextInfo = document.getElementById('ai-context-info');
    const promptLabel = document.getElementById('ai-prompt-label');
    const contextScenario = document.getElementById('ai-context-scenario');
    const contextSceneNum = document.getElementById('ai-context-scene-num');

    if (aiMode === 'scene' && sceneContext) {
        // Show context info for scene mode
        if (contextInfo) contextInfo.style.display = 'flex';
        if (contextScenario) contextScenario.textContent = sceneContext.scenarioName;
        if (contextSceneNum) contextSceneNum.textContent = `(Scene ${sceneContext.sceneCount + 1})`;
        if (promptLabel) promptLabel.textContent = 'Describe what this new scene should show';
        if (elements.aiPrompt) {
            elements.aiPrompt.placeholder = 'E.g., Show pod autoscaling with HPA monitoring metrics and replica adjustments...';
        }
    } else {
        // Hide context info for scenario mode
        if (contextInfo) contextInfo.style.display = 'none';
        if (promptLabel) promptLabel.textContent = 'Describe your animation scenario';
        if (elements.aiPrompt) {
            elements.aiPrompt.placeholder = 'E.g., Create a CI/CD pipeline with GitHub, Jenkins, Docker, and Kubernetes showing the deployment flow...';
        }
    }
}

function closeAIModal() {
    if (elements.aiModal) {
        elements.aiModal.style.display = 'none';
        llmService?.cancel();
        sceneContext = null;
    }
}

function updateCharCount() {
    if (elements.aiPrompt && elements.aiCharCount) {
        const len = elements.aiPrompt.value.length;
        elements.aiCharCount.textContent = `${len}/500`;
    }
}

function toggleApiKeyVisibility() {
    if (elements.aiApiKey) {
        const isPassword = elements.aiApiKey.type === 'password';
        elements.aiApiKey.type = isPassword ? 'text' : 'password';
    }
}

function showAIError(message) {
    if (elements.aiError && elements.aiErrorMessage) {
        elements.aiErrorMessage.textContent = message;
        elements.aiError.style.display = 'flex';
    }
}

function hideAIError() {
    if (elements.aiError) {
        elements.aiError.style.display = 'none';
    }
}

function showAILoading() {
    if (elements.aiLoading) {
        elements.aiLoading.style.display = 'flex';
        elements.btnGenerateAi.disabled = true;
    }
}

function hideAILoading() {
    if (elements.aiLoading) {
        elements.aiLoading.style.display = 'none';
        elements.btnGenerateAi.disabled = false;
    }
}

/**
 * Generate based on current mode (scenario or scene)
 */
async function generateWithAI() {
    const prompt = elements.aiPrompt?.value?.trim();

    if (!prompt) {
        showAIError('Please enter a prompt.');
        return;
    }

    // Save API key if provided
    const apiKey = elements.aiApiKey?.value?.trim();
    if (apiKey) {
        llmService.saveApiKey(apiKey);
    }

    hideAIError();
    showAILoading();

    try {
        if (aiMode === 'scene' && sceneContext) {
            // Generate a new scene for existing scenario
            await generateNewScene(prompt);
        } else {
            // Generate full scenario
            await generateFullScenario(prompt);
        }
    } catch (err) {
        handleAIError(err);
    } finally {
        hideAILoading();
    }
}

/**
 * Generate a full scenario
 */
async function generateFullScenario(prompt) {
    // Check if Rich Generation is enabled
    const richModeToggle = document.getElementById('ai-rich-mode');
    const useRichGeneration = richModeToggle?.checked ?? true;

    let yaml;
    if (useRichGeneration) {
        // Use multi-stage pipeline for rich generation
        logger.info('Using Rich Generation pipeline');
        yaml = await llmService.generatePipeline(prompt, {
            sceneCount: 3,
            stepsPerScene: { min: 8, max: 12 }
        });
    } else {
        // Use simple single-call generation
        yaml = await llmService.generateScenario(prompt);
    }

    // Insert YAML into editor
    if (elements.yamlEditor) {
        elements.yamlEditor.value = yaml;
        elements.yamlEditor.dispatchEvent(new Event('input'));
    }

    closeAIModal();
    showToast('Scenario generated! Click "Apply & Play" to see it.');
    logger.info('AI scenario generated successfully');
}

/**
 * Generate a new scene and append to current scenario
 */
async function generateNewScene(prompt) {
    const newScene = await llmService.generateScene(
        prompt,
        sceneContext.scenario,
        sceneContext.sceneCount
    );

    // Append scene to current scenario
    if (!currentScenario.scenes) {
        // Convert single-scene to multi-scene format
        const firstScene = {
            name: currentScenario.name || 'Scene 1',
            description: currentScenario.description || '',
            zones: currentScenario.zones || [],
            components: currentScenario.components || [],
            connections: currentScenario.connections || [],
            steps: currentScenario.steps || []
        };
        currentScenario.scenes = [firstScene];
    }

    // Add new scene
    currentScenario.scenes.push(newScene);

    // Re-render scenes list
    renderScenesList(currentScenario);

    // Switch to the new scene
    const newSceneIndex = currentScenario.scenes.length - 1;
    loadScenario(currentScenario, newSceneIndex);

    closeAIModal();
    showToast(`Scene ${newSceneIndex + 1} added! "${newScene.name}"`);
    logger.info('New scene added', { sceneName: newScene.name, index: newSceneIndex });
}

/**
 * Handle AI errors with specific messages
 */
function handleAIError(err) {
    logger.error('AI generation failed', err);

    if (err instanceof LLMError) {
        switch (err.code) {
            case LLM_ERRORS.RATE_LIMIT:
                showAIError(err.message);
                break;
            case LLM_ERRORS.TIMEOUT:
                showAIError('Request timed out. Please try again.');
                break;
            case LLM_ERRORS.INVALID_KEY:
                showAIError('Invalid API key. Please check and try again.');
                break;
            case LLM_ERRORS.QUOTA_EXCEEDED:
                showAIError('API quota exceeded. Check your OpenAI billing.');
                break;
            case LLM_ERRORS.SCHEMA_ERROR:
                showAIError('AI returned invalid output. Try rephrasing your prompt.');
                break;
            default:
                showAIError(err.message || 'Generation failed. Please try again.');
        }
    } else {
        showAIError('Network error. Check your connection.');
    }
}

/**
 * Add Scene button handler - opens modal with context
 */
function addNewScene() {
    if (!llmService) {
        llmService = getLLMService();
    }

    // Open AI modal in scene mode with current scenario context
    openAIModalForScene();
}

function setupAIEventListeners() {
    // Open AI modal from YAML editor (full scenario mode)
    elements.btnAiGenerate?.addEventListener('click', openAIModal);

    // Close AI modal
    elements.btnCloseAi?.addEventListener('click', closeAIModal);
    elements.btnCancelAiModal?.addEventListener('click', closeAIModal);

    // Close on backdrop click
    elements.aiModal?.addEventListener('click', (e) => {
        if (e.target === elements.aiModal) {
            closeAIModal();
        }
    });

    // API key visibility toggle
    elements.btnToggleKey?.addEventListener('click', toggleApiKeyVisibility);

    // Character count
    elements.aiPrompt?.addEventListener('input', updateCharCount);

    // Cancel loading
    elements.btnCancelAi?.addEventListener('click', () => {
        llmService?.cancel();
        hideAILoading();
        showToast('Request cancelled.');
    });

    // Generate button (works for both modes)
    elements.btnGenerateAi?.addEventListener('click', generateWithAI);

    // Enter to generate (with modifier key)
    elements.aiPrompt?.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            generateWithAI();
        }
    });

    // Add Scene button - opens AI modal in scene mode
    elements.btnAddScene?.addEventListener('click', addNewScene);

    // New Scenario button - opens AI modal in scenario mode
    elements.btnNewScenario?.addEventListener('click', () => {
        // Clear current scenario and open AI modal for new scenario
        openAIModal();
    });
}


// =====================================================
// Start the application
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    init();
    initAIAssistant();
    setupAIEventListeners();
});
