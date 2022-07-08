const { EventEmitter } = require('events');
const {
    min, max, sumValues, round,
    capitalizeFirst,
} = require('./utils');

// TODO: check elapsed time between 'nexts' and fill in missing buckets?

class Series extends EventEmitter {
    constructor(interval, range, states, options = {}) {
        super();
        this.interval = interval;
        this.range = range;
        this.states = states || [];
        this.strict = options?.strict ?? (states && states.length);
        this.precision = options?.precision ?? 2;
        if (!this.range) {
            this.range = Math.floor(this.interval / 60) || 1;
        }
        if (this.interval % this.range !== 0) throw new Error('Interval must be a multiple of range');
        this.buckets = this.interval / this.range;
        this.rangeMs = this.range * 1000;
        this.countBuckets = {};
        this.valueBuckets = {};
        this.minBuckets = {};
        this.maxBuckets = {};
        this.counts = {};
        this.sums = {};
        this.mins = {};
        this.maxs = {};
        for (const s of this.states) {
            this.countBuckets[s] = [0];
            this.valueBuckets[s] = [0];
            this.minBuckets[s] = [null];
            this.maxBuckets[s] = [null];
            this.counts[s] = 0;
            this.sums[s] = 0;
            this.mins[s] = null;
            this.maxs[s] = null;
        }
        this.timeout = setTimeout(() => this.next(), this.rangeMs - Date.now() % this.rangeMs).unref();
    }

    destroy() {
        clearTimeout(this.timeout);
        this.timeout = null;
    }

    insert(state, count = 1, value = 0) {
        if (this.strict && !this.states.includes(state)) {
            return this.emit('warning', `Uknown series tag ${state}`);
        }
        const val = round(value, this.precision);
        this.countBuckets[state][0] += count;
        this.valueBuckets[state][0] += val * count;
        this.minBuckets[state][0] = min(val, this.minBuckets[state][0]);
        this.maxBuckets[state][0] = max(val, this.maxBuckets[state][0]);
    }

    addBucket(buckets, aggregate, removal, addition, startValue = 0) {
        const remove = removal || ((state, bucket) => {
            aggregate[state] -= bucket;
        });
        const add = addition || ((state, buckets) => {
            aggregate[state] += buckets[0];
        });
        for (const s of this.states) {
            const stateBuckets = buckets[s];
            if (stateBuckets.length > this.buckets) {
                const removed = stateBuckets.pop();
                remove(s, removed);
            }
            add(s, stateBuckets);
            stateBuckets.unshift(startValue);
        }
    }

    next() {
        this.addBucket(this.countBuckets, this.counts);
        this.addBucket(this.valueBuckets, this.sums);
        this.addBucket(this.minBuckets, this.mins,
            () => { },
            (state, buckets) => { this.mins[state] = min(...buckets); },
            null,
        );
        this.addBucket(this.maxBuckets, this.maxs,
            () => { },
            (state, buckets) => { this.maxs[state] = max(...buckets); },
            null,
        );
        this.timeout = setTimeout(() => this.next(), this.rangeMs - Date.now() % this.rangeMs).unref();
    }

    static get metrics() {
        return [
            'count', 'sum', 'min', 'max', 'average', 'rate', 'speed',
        ];
    }

    _get(metric, state) {
        if (state && this.strict && !this.states.includes(state)) {
            this.emit('warning', `Uknown series tag ${state}`);
            return null;
        }
        return this[`_get${capitalizeFirst(metric)}`](state);
    }

    _getCount(state) {
        if (state) {
            return this.counts[state];
        }
        return sumValues(this.counts);
    }

    _getSum(state) {
        if (state) {
            return this.sums[state];
        }
        return sumValues(this.sums);
    }

    _getMin(state) {
        if (state) {
            return this.mins[state];
        }
        return min(...Object.values(this.mins));
    }

    _getMax(state) {
        if (state) {
            return this.maxs[state];
        }
        return max(...Object.values(this.maxs));
    }

    _getAverage(state) {
        return round(this._getSum(state) / this._getCount(state), this.precision);
    }

    _getRate(state) {
        return round(this._getCount(state) / this.interval, 2);
    }

    _getSpeed(state) {
        return round(this._getSum(state) / this.interval, this.precision);
    }

    getCount(state) {
        return this._get('count', state);
    }

    getSum(state) {
        return this._get('sum', state);
    }

    getMin(state) {
        return this._get('min', state);
    }

    getMax(state) {
        return this._get('max', state);
    }

    getAverage(state) {
        return this._get('average', state);
    }

    getRate(state) {
        return this._get('rate', state);
    }

    getSpeed(state) {
        return this._get('speed', state);
    }
}

module.exports = Series;
