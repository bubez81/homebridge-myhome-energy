'use strict';
module.exports = function applyMeterType(accessory, meter) {
    const selected = meter.config.matterDeviceType || 'outlet';
    if (selected === 'outlet') return accessory;
    if (!['electricalMeter', 'electricalSensor'].includes(selected)) throw new Error('Unsupported matterDeviceType: ' + selected);
    const typeName = selected === 'electricalSensor' ? 'ElectricalSensor' : 'ElectricalMeter';
    const type = meter.api.matter.deviceTypes[typeName];
    if (!type) throw new Error(typeName + ' requires a Homebridge version exposing this device type');
    accessory.deviceType = type;
    delete accessory.clusters.onOff;
    delete accessory.handlers.onOff;
    const readState = accessory.getState;
    accessory.getState = (cluster, attribute) => cluster === 'onOff' ? undefined : readState(cluster, attribute);
    return accessory;
};
