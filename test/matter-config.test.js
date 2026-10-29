const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalizeMatterConfig}=require('../lib/matter-config');
test('legacy migration preserves identity fields and unrelated configuration without mutating input',()=>{
 const old={platform:'LegrandMyHome',matterPowerTopologyExperiment:true,matterPowerTopologyDiagnostics:true,_bridge:{username:'stable'},devices:[{accessory:'MHPowerMeter',name:'General',address:'51',matterDeviceType:'electricalMeter',matterPowerTopology:'node'},{accessory:'MHPowerMeter',name:'Dishwasher',address:'510',matterPowerTopology:'set'},{accessory:'MHRelay',address:'0/1/1'}]};
 const snapshot=structuredClone(old), next=normalizeMatterConfig(old);
 assert.deepEqual(old,snapshot);assert.equal(next.matterDiagnostics,true);assert.deepEqual(next._bridge,old._bridge);assert.equal(next.devices[0].matterDeviceType,'electricalMeter');assert.equal(next.devices[1].matterDeviceType,'outlet');assert.equal(next.devices[1].address,'510');assert.equal(next.devices[1].matterPowerTopology,undefined);assert.equal(next.matterPowerTopologyExperiment,undefined);assert.deepEqual(normalizeMatterConfig(next),next);
});
test('invalid device types are rejected; schema no longer offers topology controls',()=>{
 assert.throws(()=>normalizeMatterConfig({devices:[{accessory:'MHPowerMeter',matterDeviceType:'unknown'}]}),/Invalid/);
 const schema=require('../config.schema.json');const p=schema.schema.properties;
 assert.equal(p.matterPowerTopologyExperiment,undefined);assert.equal(p.devices.items.properties.matterPowerTopology,undefined);assert.equal(p.devices.items.properties.matterTopology,undefined);
});
