const gait = require('../index');

const rate = gait({
    intervals: ['1s', '5s', '1m', '5m', '1h']
});

const speed = gait({
    intervals: ['1s', '5s', '1m', '5m', '1h'],
    valueResolver: ({ result }) => result,
});

const meters = gait.compose(speed, rate);
meters.on('warning', console.log);

(async () => {
    for (const i of Array(1e6)) {
        // console.log('5s count ok:', rate.count5s('ok'));
        // console.log('5s count error:', rate.count5s('error'));
        // console.log('5s count total:', rate.count5s());
        // console.log('5s min ok:', rate.min5s('ok'));
        // console.log('5s min error:', rate.min5s('error'));
        // console.log('5s min total:', rate.min5s());
        // console.log('5s max ok:', rate.max5s('ok'));
        // console.log('5s max error:', rate.max5s('error'));
        // console.log('5s max total:', rate.max5s());
        // console.log('5s sum ok:', rate.sum5s('ok'));
        // console.log('5s sum error:', rate.sum5s('error'));
        // console.log('5s sum total:', rate.sum5s());
        // console.log('5s average ok:', rate.average5s('ok'));
        // console.log('5s average error:', rate.average5s('error'));
        // console.log('5s average total:', rate.average5s());
        // console.log('5s rate ok:', rate.rate5s('ok'));
        // console.log('5s rate error:', rate.rate5s('error'));
        // console.log('5s rate total:', rate.rate5s());
        console.log(rate.all());
        console.log(speed.all());
        await meters(
            new Promise(res => setTimeout(res, Math.random() * 50 + 50))
                .then(() => {
                    if (Math.random() > 0.2) {
                        return Math.round(Math.random() * 50e3) + 50e3;
                    } else {
                        return Promise.reject();
                    }
                }),
        ).catch(() => { });
    }
})();
