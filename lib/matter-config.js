'use strict';

// Legacy topology controls never expressed a meter hierarchy. Electrical
// measurement topology is now supplied by Homebridge's standard composition.
function normalizeMatterConfig(config) {
    const result = { ...config };
    result.matterDiagnostics = config.matterDiagnostics ?? config.matterPowerTopologyDiagnostics ?? false;
    result.devices = (config.devices || []).map(device => {
        const meter = { ...device };
        if (device.accessory === 'MHPowerMeter') {
            meter.matterDeviceType = device.matterDeviceType ?? 'outlet';
            if (!['outlet', 'electricalMeter', 'electricalSensor'].includes(meter.matterDeviceType)) {
                throw new Error(`Invalid matterDeviceType for ${device.name}: ${meter.matterDeviceType}`);
            }
        }
        delete meter.matterPowerTopology;
        delete meter.matterTopology;
        return meter;
    });
    delete result.matterPowerTopologyExperiment;
    delete result.matterPowerTopologyDiagnostics;
    return result;
}
module.exports = { normalizeMatterConfig };
