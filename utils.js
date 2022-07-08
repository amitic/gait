const { EventEmitter } = require('events');

const EMITTER = Symbol('emitter');
function emitterify(obj) {
    if (obj[EMITTER]) return obj;
    obj[EMITTER] = new EventEmitter();
    for (const key of Object.keys(EventEmitter.prototype)) {
        if (typeof EventEmitter.prototype[key] === 'function') {
            obj[key] = (...args) => obj[EMITTER][key](...args);
        }
    }
    return obj;
}

const FORWARDERS = Symbol('forwarders');
function eventForwarder(obj, ...sources) {
    if (!obj[FORWARDERS]) obj[FORWARDERS] = [];
    const fwds = sources.filter(s => !obj[FORWARDERS].includes(s));
    if (!fwds.length) return obj;
    for (const key of Object.keys(EventEmitter.prototype)) {
        if (typeof EventEmitter.prototype[key] === 'function') {
            obj[key] = (...args) => sources.map(s => s[key](...args));
        }
    }
    return obj;
}

function min(...values) {
    return Math.min(...values.filter(v => (v != null && !Number.isNaN())));
}

function max(...values) {
    return Math.max(...values.filter(v => (v != null && !Number.isNaN())));
}

function sum(arr) {
    return arr.reduce((s, v) => s + v, 0);
}

function sumValues(obj) {
    return sum(Object.values(obj || {}));
}

function round(value, precision = 2) {
    const places = Math.pow(10, precision);
    return Math.round(value * places) / places;
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function arrayize(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    return [value];
}

function parseIntervalRange(intrange) {
    const [interval, range, ...rest] = (intrange || '').split(':');
    if (rest.length) throw new Error('Invalid time interval');
    return [
        parseInterval(interval),
        range && parseInterval(range),
    ];
}

function parseInterval(interval) {
    const match = (interval || '').match(/^(\d+)(s|m|h|d)?$/);
    if (!match) throw new Error('Invalid time interval');
    switch (match[2]) {
        case 'd':
            return (+match[1])*24*3600;
        case 'h':
            return (+match[1])*3600;
        case 'm':
            return (+match[1])*60;
        case 's':
        default:
            return +match[1];
    }
}

function formatInterval(interval) {
    if (!interval) throw new Error('Invalid time interval');
    if (interval >= 24*3600) return `${interval/(24*3600)}d`;
    if (interval >= 3600) return `${interval/3600}h`;
    if (interval >= 60) return `${interval/60}m`;
    return `${interval}s`;
}

function normalizeInterval(interval) {
    let i = interval;
    if (typeof i === 'string') i = parseInterval(i);
    return formatInterval(i);
}

module.exports = {
    emitterify,
    eventForwarder,
    min,
    max,
    sum,
    sumValues,
    round,
    capitalizeFirst,
    arrayize,
    parseInterval,
    parseIntervalRange,
    formatInterval,
    normalizeInterval,
};
