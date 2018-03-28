const {si} = require('nyaapi')
const {parseTorrentGroup, groupBy, fetchMetadata} = require('./utils')
const sourceMap = {
  hs: 'HorribleSubs',
  py: 'puyero'
}

const asyncWrapper = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

async function latest(req, res) {
  // page is added 1 to get 0-based paging
  // rpp is multipled by 3 because results will be grouped
  const data = await si.searchByUserAndByPage({
    user: sourceMap[req.query.source || 'hs'],
    term: req.query.q,
    p: (req.query.page || 0) + 1,
    n: (req.query.rpp || 20) * 3,
    filter: 2
  });
  const grouped = groupBy(
    parseTorrentGroup(data),
    item => item.showTitle + item.episodeNumber
  );
  const flattened = Object.keys(grouped)
    .map(key => grouped[key][0]);
  const promises = flattened.map(torrent => (
    fetchMetadata(torrent.slug).then(metadata => ({
      ...metadata,
      slug: torrent.slug,
      showTitle: torrent.showTitle,
      episodeNumber: torrent.episodeNumber,
      episodeDate: torrent.timestamp,
      episodeSize: torrent.fileSize
    }))
  ))
  const withMetadata = await Promise.all(promises);
  res.json(withMetadata);
}

async function show(req, res) {
  const showName = req.params.slug.replace(/-/g, ' ');
  const shouldAddMeta = Boolean(req.query.meta);
  const episodes = await si.searchByUserAndByPage({
    user: sourceMap[req.query.source || 'hs'],
    term: showName,
    p: (req.query.page || 0) + 1,
    n: (req.query.rpp || 20) * 3,
    filter: 2
  });
  const groupedByEp = groupBy(
    parseTorrentGroup(episodes),
    'episodeNumber'
  );
  const epsWithQualities = Object.keys(groupedByEp).map(key => {
    const group = groupedByEp[key];
    const qualities = group.reduce((prev, next) => {
      prev[next.quality] = {
        magnet: next.link,
        peers: next.peers,
        seeds: next.seeds
      };
      return prev;
    }, {})
    return {
      ...group[0],
      seeders: undefined,
      leechers: undefined,
      quality: undefined,
      link: undefined,
      qualities
    }
  })

  let meta = {}
  if (shouldAddMeta) {
    meta = await fetchMetadata(showName);
  }
  res.json({
    ...meta,
    episodes: epsWithQualities
  })
}

// global error handler
// is reached when some previous handler function calls next with an error
const errorHandler = (err, req, res, next) => {
  if (process.env.ENV === 'dev') {
    console.error(err)
  } else {
    console.error(err.message)
    err.message = "Internal server error"
  }
  let status = err.status || 500
  res.status(status)
     .json({name: err.name, status, error: err.message});
}

exports.latest = asyncWrapper(latest);
exports.show = asyncWrapper(show);
exports.errorHandler = errorHandler;
