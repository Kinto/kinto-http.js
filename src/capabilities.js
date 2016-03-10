const CAPABILITIES = {
  deleteBuckets: "1.4",
  deleteCollections: "1.4",
};

export default function getCapabilitiesHandler(serverProtocolVersion) {
  return {
    apply: function(target, thisArg, argumentsList) {
      if (CAPABILITIES.hasOwnProperty(thisArg) &&
          serverProtocolVersion < CAPABILITIES[thisArg]) {
        const msg = `Capability {thisArg} is supported from ` +
                    `server version {CAPABILITIES[thisArg]}. ` +
                    `The currently configured server is ` +
                    `supporting {serverProtocolVersion}`;
        throw new Error(msg);
      }
      return target.apply(target, thisArg, argumentsList);
    }
  };
}
