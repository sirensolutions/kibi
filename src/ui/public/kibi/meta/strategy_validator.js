export function countStrategyValidator(strategy) {
  const throwMissingProperty = function (p) {
    throw new Error('Strategy should contain a "' + p + '" property ' + JSON.stringify(strategy, null, ' '));
  };

  const throwShouldBeInteger = function (p) {
    throw new Error('The "' + p + '" property should be an integer ' + JSON.stringify(strategy, null, ' '));
  };

  const throwShouldValidInteger = function (p, condition) {
    throw new Error('The "' + p + '" property should be ' + condition + ' ' + JSON.stringify(strategy, null, ' '));
  };

  if (!strategy.name) {
    throwMissingProperty('name');
  }
  if (!strategy.batchSize) {
    throwMissingProperty('batchSize');
  }
  if (!strategy.batchSize) {
    throwMissingProperty('retryOnError');
  }
  if (!strategy.batchSize) {
    throwMissingProperty('parallelRequests');
  }

  if (typeof strategy.batchSize !== 'number') {
    throwShouldBeInteger('batchSize');
  }
  if (typeof strategy.retryOnError !== 'number') {
    throwShouldBeInteger('retryOnError');
  }
  if (typeof strategy.parallelRequests !== 'number') {
    throwShouldBeInteger('parallelRequests');
  }

  if (strategy.batchSize < 1) {
    throwShouldValidInteger('batchSize', '>= 1');
  }
  if (strategy.retryOnError < 0) {
    throwShouldValidInteger('retryOnError', '>= 0');
  }
  if (strategy.parallelRequests < 1) {
    throwShouldValidInteger('parallelRequests', '>=1');
  }

  return strategy;
}
