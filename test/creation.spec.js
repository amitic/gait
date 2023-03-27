const chai = require('chai');
const sinon = require('sinon');

const expect = chai.expect;
chai.use(require('sinon-chai'));
chai.use(require('chai-eventemitter2')());

const pmeter = require('../index');

describe('Creation', async function () {
    it('should default to 5s/1m/1h/1d intervals', function () {
        const meter = pmeter.create();
        expect(meter.count5s).to.be.a('function');
        expect(meter.count1m).to.be.a('function');
        expect(meter.count1h).to.be.a('function');
        expect(meter.count1d).to.be.a('function');
        meter.destroy();
    });

    it('should use provided intervals', function () {
        const meter = pmeter.create({
            intervals: ['6s', '7m'],
        });
        expect(meter.count5s).to.be.undefined;
        expect(meter.count1m).to.be.undefined;
        expect(meter.count1h).to.be.undefined;
        expect(meter.count1d).to.be.undefined;
        expect(meter.count6s).to.be.a('function');
        expect(meter.count7m).to.be.a('function');
        meter.destroy();
    });

    it('should default to ok/error states', function () {
        const meter = pmeter.create();
        expect(meter).to.emit('warning', { count: 0 })
            .on(() => {
                meter.totalCount('ok');
                meter.totalCount('error');
            });
        meter.destroy();
    });

    it('should use provided states', function () {
        const meter = pmeter.create({
            states: ['success', 'fail'],
        });
        expect(meter).to.emit('warning', { count: 0 })
            .on(() => {
                meter.totalCount('success');
                meter.totalCount('fail');
            });
        expect(meter).to.emit('warning', { count: 2 })
            .on(() => {
                meter.totalCount('ok');
                meter.totalCount('error');
            });
        meter.destroy();
    });
});
