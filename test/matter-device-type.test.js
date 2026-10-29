const {test}=require('node:test');
const assert=require('node:assert/strict');
const apply=require('../lib/matter-device-type');
test('native meter preserves identity and measurements, removes fake switch',()=>{
 const type={};const a={UUID:'stable',serialNumber:'stable-serial',clusters:{onOff:{onOff:true},electricalPowerMeasurement:{activePower:123000}},handlers:{onOff:{}},getState:()=>123000};
 apply(a,{config:{matterDeviceType:'electricalMeter'},api:{matter:{deviceTypes:{ElectricalMeter:type}}}});
 assert.equal(a.UUID,'stable');assert.equal(a.serialNumber,'stable-serial');assert.equal(a.deviceType,type);assert.equal(a.clusters.onOff,undefined);assert.equal(a.handlers.onOff,undefined);assert.equal(a.getState('onOff','onOff'),undefined);assert.equal(a.getState('electricalPowerMeasurement','activePower'),123000);
});
test('existing installations keep outlet type; unsupported runtime fails explicitly',()=>{
 const a={};assert.equal(apply(a,{config:{}}),a);
 assert.throws(()=>apply(a,{config:{matterDeviceType:'electricalMeter'},api:{matter:{deviceTypes:{}}}}),/requires/);
});
test('native meter initializes with actual Homebridge measurement defaults', {skip:!process.env.HOMEBRIDGE_TEST_ROOT},async()=>{
 const {pathToFileURL}=require('node:url');const {join}=require('node:path');const root=process.env.HOMEBRIDGE_TEST_ROOT;const load=p=>import(pathToFileURL(join(root,p)).href);
 const {deviceTypes}=await load('dist/matter/types.js');const h=await load('dist/matter/serverHelpers.js');const {Endpoint,ServerNode,Environment,Filesystem}=await load('node_modules/@matter/main/dist/esm/index.js');
 const a={deviceType:deviceTypes.ElectricalMeter,clusters:{electricalPowerMeasurement:{activePower:123000},electricalEnergyMeasurement:{cumulativeEnergyImported:{energy:456000}}}};
 const d=h.detectElectricalMeasurementClusters(a);h.applyElectricalMeasurementDefaults(a,d);a.deviceType=h.applyElectricalMeasurementClusters(a.deviceType,a,d);
 const {mkdtemp,rm}=require('node:fs/promises');const {tmpdir}=require('node:os');const {NodeJsFilesystem}=await load('node_modules/@matter/nodejs/dist/esm/index.js');const storage=await mkdtemp(join(tmpdir(),'native-meter-'));const env=new Environment('native-meter',Environment.default);env.set(Filesystem,new NodeJsFilesystem(storage));const node=await ServerNode.create({id:'native-meter',environment:env});
 const ep=new Endpoint(a.deviceType,{id:'native-meter-test',...a.clusters});await node.add(ep);try{assert.equal(ep.state.electricalPowerMeasurement.activePower,123000);assert.equal(ep.state.electricalEnergyMeasurement.cumulativeEnergyImported.energy,456000);}finally{await node.close();await rm(storage,{recursive:true,force:true});}
});
