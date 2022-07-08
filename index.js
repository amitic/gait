const Series = require('./series');
const {
    emitterify, eventForwarder, arrayize, capitalizeFirst,
    sumValues, parseIntervalRange, formatInterval,
} = require('./utils');

function compose(...fns) {
    return eventForwarder(
        x => fns.reverse().reduce((y, f) => f(y), x),
        ...fns,
    );
}

const NONE = Symbol('none');

function gait(options) {
    const intervals = options?.intervals
        ? arrayize(options.intervals)
        : ['5s', '1m', '1h', '1d'];
    const states = typeof options?.states !== 'undefined'
        ? arrayize(options.states ?? NONE)
        : ['ok', 'error'];
    const stateless = states[0] === NONE;
    const strict = options?.strict ?? true;
    const stateResolver = options?.stateResolver || (
        stateless
            ? () => NONE
            : ({ result, error }) => error ? 'error' : 'ok'
    );
    const valueResolver = options?.valueResolver || (({ result, error, startTime }) => {
        return Date.now() - startTime;
    });
    const series = {};
    const totalCounts = {};
    const totalSums = {};
    for (const s of states) {
        totalCounts[s] = 0;
        totalSums[s] = 0;
    }
    const insert = (state, value) => {
        totalCounts[state] += 1;
        totalSums[state] += value;
        for (const s of Object.values(series)) {
            s.insert(state, 1, value);
        }
    }
    const meter = emitterify(promise => {
        let p = promise;
        const start = Date.now();
        let skipped = false;
        const skip = () => { skipped = true; };
        const ins = (...args) => {
            if (!skipped) return insert(...args);
        };
        if (typeof p === 'function') {
            try {
                p = promise();
            } catch (err) {
                ins(
                    stateResolver({ error: err, skip }),
                    valueResolver({ startTime: start, error: err }),
                );
                throw err;
            }
        }
        if (p && p.then) {
            p.then(
                result => ins(
                    stateResolver({ result, skip }),
                    valueResolver({ startTime: start, result }),
                ),
                err => ins(
                    stateResolver({ error: err || true, skip }),
                    valueResolver({ startTime: start, error: err }),
                ),
            );
        } else {
            ins(
                stateResolver({ result: p || 1, skip }),
                valueResolver({ startTime: start, result: p || 1 }),
            );
        }
        return promise;
    });
    meter.states = states;
    meter.series = series;
    meter.totalCount = function (state) {
        if (state && strict && !states.includes(state)) {
            this.emit('warning', `Uknown series tag ${state}`);
            return 0;
        }
        if (state) return totalCounts[state];
        return sumValues(totalCounts);
    };
    meter.totalSum = function (state) {
        if (state && strict && !states.includes(state)) {
            this.emit('warning', `Uknown series tag ${state}`);
            return 0;
        }
        if (state) return totalSums[state];
        return sumValues(totalSums);
    };
    meter.metrics = function ({ states, metrics, series, formatter = (m, x) => x }) {
        const statesArray = stateless
            ? [null]
            : (states
                ? [...arrayize(states), null]
                : [...meter.states, null]);
        const metricsNames = metrics && metrics.filter(m => Series.metrics.includes(m))
            || Series.metrics;
        const seriesNames = series && series.filter(s => Object.keys(meter.series).includes(s))
            || Object.keys(meter.series);
        const all = statesArray.reduce((aggregate, state) => ({
            ...aggregate,
            [state || '_']: seriesNames.reduce((agg, serie) => ({
                ...agg,
                ...metricsNames.reduce((all, metric) => ({
                    ...all,
                    [`${metric}${serie}`]: formatter(metric, this[`${metric}${serie}`](
                        (stateless && !state) ? NONE : state,
                    )),
                }), {}),
            }), {}),
        }), {});
        if (stateless) return all['_'];
        return all;
    };
    meter.totals = function ({ ...rest }) {
        return this.metrics({ ...rest, states: [] });
    };
    meter.destroy = function () {
        for (const s of Object.values(series)) s.destroy();
    }
    for (const i of intervals) {
        const [interval, range] = parseIntervalRange(i);
        const seriesName = formatInterval(interval);
        if (series[seriesName]) throw new Error(`Duplicate interval: ${seriesName}`);
        else {
            try {
                series[seriesName] = new Series(interval, range, states, { strict });
                series[seriesName].on('warning', (...args) => meter.emit('warning', ...args));
                series[seriesName].on('error', (...args) => meter.emit('error', ...args));
            } catch (err) {
                throw new Error(`Error creating series: ${seriesName}`, err.message);
            }
        }
    }
    // TODO: replace proxy with instance methods
    return new Proxy(meter, {
        get(target, prop, receiver) {
            const p = prop.toLowerCase();
            const match = p.match(/^(count|sum|min|max|average|rate|speed)(\d+(s|m|h|d))$/i);
            if (match) {
                const seriesName = match[2].toLowerCase();
                const s = series[seriesName];
                if (s) {
                    const method = `get${capitalizeFirst(match[1])}`;
                    return state => s[method].call(s, state);
                }
            }
            return Reflect.get(target, prop, receiver);
        }
    });
}

gait.create = gait;
gait.compose = compose;
gait.NONE = NONE;

module.exports = gait;
