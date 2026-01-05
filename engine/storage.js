/**
 * Flow Animation Engine - Storage Service
 * Manages localStorage for saving/loading YAML drafts
 * 
 * @module engine/storage
 * @version 2.2.0
 */

import { createLogger } from './logger.js';

const logger = createLogger('Storage');

// =====================================================
// Constants
// =====================================================

const STORAGE_PREFIX = 'flow-engine-';
const DRAFTS_KEY = STORAGE_PREFIX + 'drafts';
const AUTO_SAVE_KEY = STORAGE_PREFIX + 'autosave';
const SETTINGS_KEY = STORAGE_PREFIX + 'settings';
const MAX_DRAFTS = 20;

// =====================================================
// Storage Service Class
// =====================================================

export class StorageService {
    constructor() {
        this.isAvailable = this.checkAvailability();
        if (!this.isAvailable) {
            logger.warn('localStorage is not available');
        }
    }

    /**
     * Check if localStorage is available
     */
    checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get all saved drafts
     * @returns {Array} Array of draft objects
     */
    getDrafts() {
        if (!this.isAvailable) return [];

        try {
            const data = localStorage.getItem(DRAFTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            logger.error('Failed to get drafts', error);
            return [];
        }
    }

    /**
     * Save a new draft
     * @param {string} name - Draft name
     * @param {string} content - YAML content
     * @returns {Object} Saved draft object
     */
    saveDraft(name, content) {
        if (!this.isAvailable) {
            logger.warn('Cannot save - localStorage not available');
            return null;
        }

        try {
            const drafts = this.getDrafts();

            // Check if draft with same name exists
            const existingIndex = drafts.findIndex(d => d.name === name);

            const draft = {
                id: existingIndex >= 0 ? drafts[existingIndex].id : Date.now().toString(),
                name,
                content,
                savedAt: new Date().toISOString(),
                size: content.length
            };

            if (existingIndex >= 0) {
                // Update existing
                drafts[existingIndex] = draft;
                logger.info(`Updated draft: ${name}`);
            } else {
                // Add new
                drafts.unshift(draft);
                logger.info(`Created draft: ${name}`);
            }

            // Limit number of drafts
            if (drafts.length > MAX_DRAFTS) {
                drafts.pop();
            }

            localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
            return draft;
        } catch (error) {
            logger.error('Failed to save draft', error);
            return null;
        }
    }

    /**
     * Get a specific draft by ID
     * @param {string} id - Draft ID
     * @returns {Object|null} Draft object or null
     */
    getDraft(id) {
        const drafts = this.getDrafts();
        return drafts.find(d => d.id === id) || null;
    }

    /**
     * Delete a draft by ID
     * @param {string} id - Draft ID
     * @returns {boolean} Whether deletion was successful
     */
    deleteDraft(id) {
        if (!this.isAvailable) return false;

        try {
            const drafts = this.getDrafts();
            const index = drafts.findIndex(d => d.id === id);

            if (index === -1) return false;

            const deleted = drafts.splice(index, 1)[0];
            localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
            logger.info(`Deleted draft: ${deleted.name}`);
            return true;
        } catch (error) {
            logger.error('Failed to delete draft', error);
            return false;
        }
    }

    /**
     * Auto-save current content
     * @param {string} content - YAML content
     */
    autoSave(content) {
        if (!this.isAvailable || !content) return;

        try {
            const autoSave = {
                content,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(autoSave));
            logger.debug('Auto-saved content');
        } catch (error) {
            logger.error('Auto-save failed', error);
        }
    }

    /**
     * Get auto-saved content
     * @returns {Object|null} Auto-save object or null
     */
    getAutoSave() {
        if (!this.isAvailable) return null;

        try {
            const data = localStorage.getItem(AUTO_SAVE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error('Failed to get auto-save', error);
            return null;
        }
    }

    /**
     * Clear auto-save
     */
    clearAutoSave() {
        if (!this.isAvailable) return;
        localStorage.removeItem(AUTO_SAVE_KEY);
    }

    /**
     * Get user settings
     * @returns {Object} Settings object
     */
    getSettings() {
        if (!this.isAvailable) return {};

        try {
            const data = localStorage.getItem(SETTINGS_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Save user settings
     * @param {Object} settings - Settings to save
     */
    saveSettings(settings) {
        if (!this.isAvailable) return;

        try {
            const current = this.getSettings();
            const merged = { ...current, ...settings };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
            logger.debug('Settings saved');
        } catch (error) {
            logger.error('Failed to save settings', error);
        }
    }

    /**
     * Clear all stored data
     */
    clearAll() {
        if (!this.isAvailable) return;

        localStorage.removeItem(DRAFTS_KEY);
        localStorage.removeItem(AUTO_SAVE_KEY);
        localStorage.removeItem(SETTINGS_KEY);
        logger.info('All storage cleared');
    }

    /**
     * Get storage usage info
     * @returns {Object} Usage information
     */
    getUsageInfo() {
        if (!this.isAvailable) {
            return { available: false };
        }

        const drafts = this.getDrafts();
        let totalSize = 0;

        for (const key in localStorage) {
            if (key.startsWith(STORAGE_PREFIX)) {
                totalSize += localStorage.getItem(key)?.length || 0;
            }
        }

        return {
            available: true,
            draftCount: drafts.length,
            maxDrafts: MAX_DRAFTS,
            totalSizeBytes: totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2)
        };
    }
}

// =====================================================
// Singleton Instance
// =====================================================

let instance = null;

/**
 * Get the storage service instance
 * @returns {StorageService}
 */
export function getStorageService() {
    if (!instance) {
        instance = new StorageService();
    }
    return instance;
}

export default StorageService;
