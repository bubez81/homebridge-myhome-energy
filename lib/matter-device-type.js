'use strict';
module.exports = function applyMeterType(accessory, meter) {
    const selected = meter.config.matterDeviceType || 'outlet';
    if (selected === 'outlet') return accessory;
    if (selected !== 'electricalMeter') throw new Error('Unsupported matterDeviceType: ' + selected);
    const type = meter.api.matter.deviceTypes.ElectricalMeter;
    if (!type) throw new Error('ElectricalMeter requires a Homebridge version exposing this device type (2.4.1-beta.17 or later)');
    accessory.deviceType = type;
    delete accessory.clusters.onOff;
    delete accessory.handlers.onOff;
    const readState = accessory.getState;
    accessory.getState = (cluster, attribute) => cluster === 'onOff' ? undefined : readState(cluster, attribute);
    return accessory;
};
