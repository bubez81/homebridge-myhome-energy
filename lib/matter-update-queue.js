'use strict';
// One queue per device: a failed update must not block subsequent readings.
module.exports = function enqueue(owner, operation) {
  const next = (owner.matterUpdateQueue || Promise.resolve()).then(operation);
  owner.matterUpdateQueue = next.catch(() => {});
  return next;
};
