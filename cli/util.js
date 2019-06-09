const R = require('ramda');

const _isValidResult = R.allPass([
  R.has('response'),
  R.has('cookies'),
  R.has('links'),
  R.has('data'),
  R.hasPath([ 'response', 'body' ]),
  R.hasPath([ 'response', 'url' ]),
])

const filterJobResult = (jobResult, includeHtml, includeLinks, includeCookies, includeResponse) => {

  if (!jobResult)
    return {};

  if (!_isValidResult(jobResult))
    return jobResult;

  if (includeHtml)
    return R.path([ 'response', 'body' ], jobResult);
  
  return R.pipe(
    R.pick([
      includeResponse ? 'response' : undefined,
      'data',
      includeCookies ? 'cookies' : undefined,
      includeLinks ? 'links' : undefined,
    ]),
    R.dissocPath([ 'response', 'body' ]),
    R.assoc('url', R.path([ 'response', 'url' ], jobResult)),
  )(jobResult);
  
}

module.exports = {
  filterJobResult,
}