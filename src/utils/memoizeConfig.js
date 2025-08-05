// Memoize configuration module
// This allows configuration without circular dependencies

// Using an object to hold config to satisfy FP rules
// eslint-disable-next-line fp/no-let
let config = { memoizeMaxSize: 100 };

const setMemoizeMaxSize = size => {
  if (typeof size === 'number' && size > 0) {
    // eslint-disable-next-line fp/no-mutation
    config = { ...config, memoizeMaxSize: size };
  }
};

const getMemoizeMaxSize = () => config.memoizeMaxSize;

module.exports = {
  setMemoizeMaxSize,
  getMemoizeMaxSize
};
