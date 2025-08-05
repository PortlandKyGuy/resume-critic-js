const { curry, pipe, compose, map, filter, reduce } = require('ramda');
const { getMemoizeMaxSize } = require('./memoizeConfig');

// eslint-disable-next-line fp/no-loops, no-restricted-syntax
const pipeAsync = (...fns) => async x => {
  // eslint-disable-next-line fp/no-let, fp/no-mutation
  let result = x;
  // eslint-disable-next-line fp/no-loops, no-restricted-syntax
  for (const fn of fns) {
    // eslint-disable-next-line no-await-in-loop, fp/no-mutation
    result = await fn(result);
  }
  return result;
};

const parallel = async fns => Promise.all(fns.map(fn => fn()));

// eslint-disable-next-line fp/no-loops, no-restricted-syntax
const sequence = async fns => {
  const results = [];
  // eslint-disable-next-line fp/no-loops, no-restricted-syntax
  for (const fn of fns) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await fn());
  }
  return results;
};

const tryCatch = (fn, errorHandler) => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    return errorHandler(error, ...args);
  }
};

const memoize = (fn, maxSize) => {
  const cache = new Map();
  const configuredMaxSize = maxSize || getMemoizeMaxSize();

  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);

    // Prevent unbounded cache growth
    if (cache.size >= configuredMaxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

module.exports = {
  pipeAsync,
  parallel,
  sequence,
  tryCatch,
  memoize,
  curry,
  pipe,
  compose,
  map,
  filter,
  reduce
};
