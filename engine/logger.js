/**
 * Flow Animation Engine - Enterprise Logger Service
 * Corporate-grade logging with levels, timestamps, and context
 * 
 * @module engine/logger
 * @version 1.0.0
 */

// =====================================================
// Log Levels
// =====================================================

export const LogLevel = Object.freeze({
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    SILENT: 4
});

// =====================================================
// Logger Configuration
// =====================================================

const DEFAULT_CONFIG = {
    level: LogLevel.DEBUG,
    enableTimestamp: true,
    enableContext: true,
    enableColors: true,
    maxHistorySize: 1000,
    prefix: '[FlowEngine]'
};

// Console color styles
const STYLES = {
    [LogLevel.DEBUG]: 'color: #9ca3af; font-weight: normal;',
    [LogLevel.INFO]: 'color: #3b82f6; font-weight: normal;',
    [LogLevel.WARN]: 'color: #f59e0b; font-weight: bold;',
    [LogLevel.ERROR]: 'color: #ef4444; font-weight: bold;'
};

const LEVEL_NAMES = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR'
};

// =====================================================
// Logger Class
// =====================================================

class Logger {
    constructor(context = 'App') {
        this.context = context;
        this.config = { ...DEFAULT_CONFIG };
        this.history = [];
        this.timers = new Map();
    }

    /**
     * Configure the logger
     * @param {Object} options - Configuration options
     */
    configure(options) {
        this.config = { ...this.config, ...options };
        return this;
    }

    /**
     * Set the minimum log level
     * @param {number} level - LogLevel enum value
     */
    setLevel(level) {
        this.config.level = level;
        return this;
    }

    /**
     * Create a child logger with a specific context
     * @param {string} context - Context name for the child logger
     * @returns {Logger} Child logger instance
     */
    createChild(context) {
        const child = new Logger(context);
        child.config = { ...this.config };
        child.history = this.history; // Share history
        return child;
    }

    /**
     * Format timestamp
     * @private
     */
    _formatTimestamp() {
        const now = new Date();
        return now.toISOString().replace('T', ' ').substring(0, 23);
    }

    /**
     * Format log message
     * @private
     */
    _formatMessage(level, message, data) {
        const parts = [];

        if (this.config.enableTimestamp) {
            parts.push(`[${this._formatTimestamp()}]`);
        }

        parts.push(this.config.prefix);
        parts.push(`[${LEVEL_NAMES[level]}]`);

        if (this.config.enableContext) {
            parts.push(`[${this.context}]`);
        }

        parts.push(message);

        return parts.join(' ');
    }

    /**
     * Log a message
     * @private
     */
    _log(level, message, data = null) {
        if (level < this.config.level) return;

        const formattedMessage = this._formatMessage(level, message, data);
        const entry = {
            timestamp: Date.now(),
            level,
            levelName: LEVEL_NAMES[level],
            context: this.context,
            message,
            data,
            formattedMessage
        };

        // Add to history
        this.history.push(entry);
        if (this.history.length > this.config.maxHistorySize) {
            this.history.shift();
        }

        // Output to console
        if (this.config.enableColors) {
            const style = STYLES[level];
            if (data) {
                console.log(`%c${formattedMessage}`, style, data);
            } else {
                console.log(`%c${formattedMessage}`, style);
            }
        } else {
            if (data) {
                console.log(formattedMessage, data);
            } else {
                console.log(formattedMessage);
            }
        }

        return entry;
    }

    // =====================================================
    // Public Logging Methods
    // =====================================================

    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {*} [data] - Optional data to log
     */
    debug(message, data) {
        return this._log(LogLevel.DEBUG, message, data);
    }

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {*} [data] - Optional data to log
     */
    info(message, data) {
        return this._log(LogLevel.INFO, message, data);
    }

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {*} [data] - Optional data to log
     */
    warn(message, data) {
        return this._log(LogLevel.WARN, message, data);
    }

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {*} [data] - Optional data to log
     */
    error(message, data) {
        return this._log(LogLevel.ERROR, message, data);
    }

    // =====================================================
    // Performance Timing
    // =====================================================

    /**
     * Start a performance timer
     * @param {string} label - Timer label
     */
    time(label) {
        this.timers.set(label, performance.now());
        this.debug(`Timer started: ${label}`);
    }

    /**
     * End a performance timer and log duration
     * @param {string} label - Timer label
     * @returns {number} Duration in milliseconds
     */
    timeEnd(label) {
        const start = this.timers.get(label);
        if (!start) {
            this.warn(`Timer not found: ${label}`);
            return 0;
        }

        const duration = performance.now() - start;
        this.timers.delete(label);
        this.info(`Timer ${label}: ${duration.toFixed(2)}ms`);
        return duration;
    }

    // =====================================================
    // Utility Methods
    // =====================================================

    /**
     * Log a group of related messages
     * @param {string} label - Group label
     * @param {Function} callback - Function containing log calls
     */
    group(label, callback) {
        console.group(`%c${this.config.prefix} ${label}`, STYLES[LogLevel.INFO]);
        callback();
        console.groupEnd();
    }

    /**
     * Log a table
     * @param {Array|Object} data - Data to display as table
     * @param {string} [label] - Optional label
     */
    table(data, label) {
        if (label) {
            this.info(label);
        }
        console.table(data);
    }

    /**
     * Get log history
     * @param {number} [count] - Number of entries to retrieve
     * @returns {Array} Log entries
     */
    getHistory(count) {
        if (count) {
            return this.history.slice(-count);
        }
        return [...this.history];
    }

    /**
     * Clear log history
     */
    clearHistory() {
        this.history = [];
        this.info('Log history cleared');
    }

    /**
     * Export history as JSON
     * @returns {string} JSON string of log history
     */
    exportHistory() {
        return JSON.stringify(this.history, null, 2);
    }
}

// =====================================================
// Singleton Instance & Factory
// =====================================================

// Create main logger instance
const mainLogger = new Logger('Main');

/**
 * Create a logger for a specific module/context
 * @param {string} context - Context name
 * @returns {Logger} Logger instance
 */
export function createLogger(context) {
    return mainLogger.createChild(context);
}

/**
 * Get the main logger instance
 * @returns {Logger} Main logger instance
 */
export function getLogger() {
    return mainLogger;
}

// Export default logger and utilities
export default mainLogger;
export { Logger };
