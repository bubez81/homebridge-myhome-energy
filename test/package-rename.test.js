'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { applyPowerTopologyExperiment } = require('./fixtures/legacy-topology');
const { migrateCache } = require('../scripts/repair-power-topology-cache');

test('package rename: nine meters keep identities, types and readings through old/new cache restores', {
    skip: !process.env.HOMEBRIDGE_TEST_ROOT,
}, async () => {
    const root = resolve(process.env.HOMEBRIDGE_TEST_ROOT);
    const load = path => import(pathToFileURL(join(root, path)).href);
    const { Endpoint, ServerNode, Environment, Filesystem, Logger, LogLevel } = await load('node_modules/@matter/main/dist/esm/index.js');
    Logger.defaultLogLevel = LogLevel.ERROR;
    const { NodeJsFilesystem } = await load('node_modules/@matter/nodejs/dist/esm/index.js');
    const { AggregatorEndpoint } = await load('node_modules/@matter/main/dist/esm/endpoints.js');
    const { deviceTypes, deviceRequirements } = await load('dist/matter/types.js');
    const { MatterServer } = await load('dist/matter/server.js');
    const { MatterAccessoryCache } = await load('dist/matter/accessoryCache.js');
    const directory = await mkdtemp(join(tmpdir(), 'myhome-cache-restore-'));
    const environment = new Environment('cache-test', Environment.default);
    environment.set(Filesystem, new NodeJsFilesystem(directory));
    const diagnostics = [];
    function accessory(i, enabled, plugin) {
        const a = { UUID: `meter-${i}`, displayName: `Meter ${i}`, deviceType: i ? deviceTypes.ElectricalSensor : deviceTypes.ElectricalMeter,
            serialNumber: `meter-${i}`, manufacturer: 'Test', model: 'Meter', context: {},
            _associatedPlugin: plugin, _associatedPlatform: 'LegrandMyHome',
            clusters: { onOff: { onOff: true }, electricalPowerMeasurement: { activePower: 123000 },
                electricalEnergyMeasurement: { cumulativeEnergyImported: { energy: 4560000 } } },
            handlers: { onOff: { on: async () => {}, off: async () => {} } } };
        if (true) { delete a.clusters.onOff; delete a.handlers.onOff; }
        return applyPowerTopologyExperiment(a, {
            address: `${51 + i}`, name: a.displayName, api: { matter: { deviceRequirements } },
            config: { matterPowerTopology: i ? 'set' : 'node', parent: { config: { matterPowerTopologyExperiment: enabled } } },
            log: { info: line => diagnostics.push(line) },
        });
    }
    let numbers;
    let identities;
    try {
        // Model the owner metadata supplied by the public Matter API before registration.
        // Cycle 0 writes the old package; later cycles restore and register the new package.
        for (const [cycle, enabled] of [false, false, false].entries()) {
            const node = await ServerNode.create({ id: 'bridge', environment });
            const cache = new MatterAccessoryCache(directory, 'cache');
            try {
                const aggregator = new Endpoint(AggregatorEndpoint, { id: 'aggregator' });
                await node.add(aggregator);
                const server = new MatterServer({ uniqueId: 'AA:BB:CC:DD:EE:FF' });
                Object.assign(server, { serverNode: node, aggregator, accessoryCache: cache });
                if (cycle) {
                    // This is the same callback ServerLifecycle invokes before plugins register.
                    await server.getLifecycleDeps().restoreAccessoriesFromCache();
                    assert.equal(server.accessories.size, 9, 'every cached accessory must restore successfully');
                }
                await server.registerPlatformAccessories(cycle ? 'homebridge-myhome-energy' : 'homebridge-myhome-eve', 'LegrandMyHome',
                    Array.from({ length: 9 }, (_, i) => accessory(i, enabled, cycle ? 'homebridge-myhome-energy' : 'homebridge-myhome-eve')));
                const entries = [...server.accessories.values()];
                const currentNumbers = entries.map(a => a.endpoint.number);
                if (numbers) assert.deepEqual(currentNumbers, numbers, 'endpoint numbers must not drift');
                numbers = currentNumbers;
                const currentIdentities = entries.map(a => a.endpoint.state.bridgedDeviceBasicInformation.uniqueId);
                if (identities) assert.deepEqual(currentIdentities, identities, 'Matter uniqueIds must survive migration');
                identities = currentIdentities;
                for (const [i, a] of entries.entries()) {
                    const s = a.endpoint.state;
                    assert.equal(s.powerTopology.featureMap[enabled ? i ? 'setTopology' : 'treeTopology' : 'treeTopology'], true);
                    if (enabled && i) assert.deepEqual([...s.powerTopology.availableEndpoints], [a.endpoint.number]);
                    assert.equal(Number(s.electricalPowerMeasurement.activePower), 123000);
                    assert.equal(Number(s.electricalEnergyMeasurement.cumulativeEnergyImported.energy), 4560000);
                }
                for (const a of entries) {
                    await server.updateAccessoryState(a.UUID, 'electricalPowerMeasurement', { activePower: 987000 });
                    assert.equal(a.endpoint.state.electricalPowerMeasurement.activePower, 987000);
                    await server.updateAccessoryState(a.UUID, 'electricalPowerMeasurement', { activePower: 123000 });
                }
                await cache.save(server.accessories);
                const saved = JSON.parse(await readFile(join(directory, 'cache/accessories.json'), 'utf8'));
                assert.equal(saved.length, 9);
                for (const a of saved) assert.equal(a.plugin, cycle ? 'homebridge-myhome-energy' : 'homebridge-myhome-eve');
                for (const a of saved) assert.equal(a.clusters.powerTopology, undefined);
            } finally { cache.cancelPendingSave(); await node.close(); }
        }
        assert.equal(diagnostics.length, 0);
    } finally { await environment.close(); await rm(directory, { recursive: true, force: true }); }
});
