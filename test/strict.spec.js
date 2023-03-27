const chai = require('chai');
const sinon = require('sinon');

const expect = chai.expect;
chai.use(require('sinon-chai'));
chai.use(require('chai-eventemitter2')());

const pmeter = require('../index');

describe('Strict mode', async function () {
    it('should not allow missing states in strict mode', async function () {
        const meter = pmeter.create({
            stateResolver: ({ result, error }) => error ? 'error' : result,
        });
        let warnings = 0;
        meter.on('warning', (warning) => {
            if (warning == "Unknown series tag 'test'") warnings += 1;
        })
        await meter(Promise.resolve('test'));
        expect(warnings).to.eq(1);
        expect(meter).to.emit('warning')
            .on(() => {
                meter.totalCount('test');
            });
        meter.destroy();
    });

    it('should add missing states in non-strict mode', async function () {
        const meter = pmeter.create({
            stateResolver: ({ result, error }) => error ? 'error' : result,
            strict: false,
        });
        let warnings = 0;
        meter.on('warning', (warning) => {
            if (warning == "Unknown series tag 'test'") warnings += 1;
        })
        await meter(Promise.resolve('test'));
        expect(warnings).to.eq(0);
        expect(meter).to.emit('warning', { count: 0 })
            .on(() => {
                meter.totalCount('test');
            });
        meter.destroy();
    });
});
