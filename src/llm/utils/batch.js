const { curry, chunk, map, flatten } = require('ramda');

/**
 * Process multiple LLM requests in batches
 * @param {Object} options - Batch processing options
 * @returns {Function} Batch processor function
 */
const createBatchProcessor = (options = {}) => {
  const config = {
    batchSize: options.batchSize || 5,
    concurrency: options.concurrency || 3,
    onProgress: options.onProgress || (() => {}),
    onError: options.onError || (() => {}),
    retryFailed: options.retryFailed !== false
  };

  return curry(async (llmClient, requests) => {
    const batches = chunk(config.batchSize, requests);
    const results = [];
    let processed = 0;

    for (const batch of batches) {
      const batchResults = await processBatchConcurrently(
        llmClient,
        batch,
        config.concurrency,
        progress => {
          processed += progress;
          config.onProgress({
            processed,
            total: requests.length,
            percentage: (processed / requests.length) * 100
          });
        },
        config.onError
      );

      results.push(...batchResults);
    }

    return results;
  });
};

/**
 * Process a batch of requests concurrently
 * @param {Object} llmClient - LLM client instance
 * @param {Array} batch - Batch of requests
 * @param {number} concurrency - Max concurrent requests
 * @param {Function} onProgress - Progress callback
 * @param {Function} onError - Error callback
 * @returns {Promise<Array>} Results array
 */
const processBatchConcurrently = async (llmClient, batch, concurrency, onProgress, onError) => {
  const results = new Array(batch.length);
  const executing = [];

  for (let i = 0; i < batch.length; i++) {
    const promise = processRequest(llmClient, batch[i], i, results, onProgress, onError);
    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
};

/**
 * Process a single request
 * @param {Object} llmClient - LLM client instance
 * @param {Object} request - Request object
 * @param {number} index - Request index
 * @param {Array} results - Results array
 * @param {Function} onProgress - Progress callback
 * @param {Function} onError - Error callback
 * @returns {Promise} Processing promise
 */
const processRequest = async (llmClient, request, index, results, onProgress, onError) => {
  try {
    const result = await llmClient.complete(request);
    results[index] = {
      success: true,
      result,
      request,
      index
    };
    onProgress(1);
  } catch (error) {
    results[index] = {
      success: false,
      error: error.message,
      request,
      index
    };
    onError({ error, request, index });
  }
};

/**
 * Chunk requests by estimated token count
 * @param {number} maxTokens - Max tokens per chunk
 * @param {Function} tokenEstimator - Function to estimate tokens
 * @param {Array} requests - Array of requests
 * @returns {Array} Array of chunks
 */
const chunkByTokens = curry((maxTokens, tokenEstimator, requests) => {
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;

  for (const request of requests) {
    const estimatedTokens = tokenEstimator(request);

    if (currentTokens + estimatedTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(request);
    currentTokens += estimatedTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
});

/**
 * Merge multiple batch requests into a single request
 * @param {Array} requests - Array of requests
 * @param {Object} options - Merge options
 * @returns {Object} Merged request
 */
const mergeBatchRequests = (requests, options = {}) => {
  const separator = options.separator || '\n---\n';
  const includeIndex = options.includeIndex !== false;

  const mergedUser = requests.map((req, index) => {
    const prefix = includeIndex ? `[Request ${index + 1}]\n` : '';
    return prefix + req.user;
  }).join(separator);

  const mergedSystem = requests[0].system || '';

  return {
    system: mergedSystem,
    user: mergedUser,
    temperature: requests[0].temperature,
    maxTokens: options.maxTokens || requests.reduce((sum, req) => sum + (req.maxTokens || 500), 0)
  };
};

/**
 * Split merged response back into individual responses
 * @param {string} response - Merged response
 * @param {number} count - Number of expected responses
 * @param {Object} options - Split options
 * @returns {Array} Array of responses
 */
const splitBatchResponse = (response, count, options = {}) => {
  const separator = options.separator || '\n---\n';
  const parts = response.split(separator);

  if (parts.length !== count) {
    // If split doesn't match expected count, return equal portions
    const chunkSize = Math.ceil(response.length / count);
    return Array.from({ length: count }, (_, i) => response.substring(i * chunkSize, (i + 1) * chunkSize).trim());
  }

  return parts.map(part => part.trim());
};

/**
 * Estimate token count for a request (simple approximation)
 * @param {Object} request - Request object
 * @returns {number} Estimated token count
 */
const estimateTokens = request => {
  const text = `${request.system || ''} ${request.user || ''}`;
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
};

module.exports = {
  createBatchProcessor,
  chunkByTokens,
  mergeBatchRequests,
  splitBatchResponse,
  estimateTokens
};
