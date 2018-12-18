const {si} = require('nyaapi')
const {parseTorrentGroup, groupBy, fetchMetadata} = require('./utils')
const HSCalendar = require('hs-calendar');
const sourceMap = {
  hs: 'HorribleSubs',
  py: 'puyero'
}
const cal = new HSCalendar();

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
    p: +(req.query.page || 0) + 1,
    n: +(req.query.rpp || 25) * 3,
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
      posterImage: metadata.posterImage,
      slug: torrent.slug,
      fullTitle: torrent.fullTitle,
      showTitle: torrent.showTitle,
      episodeNumber: torrent.episodeNumber,
      episodeDate: torrent.timestamp
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
    p: +(req.query.page || 0) + 1,
    n: +(req.query.rpp || 25) * 3,
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
        seeds: next.seeds,
        fileSize: next.fileSize,
        numDownloads: next.numDownloads
      };
      return prev;
    }, {})
    return {
      slug: group[0].showTitle,
      showTitle: group[0].showTitle,
      fullTitle: group[0].fullTitle,
      episodeNumber: group[0].episodeNumber,
      timestamp: group[0].timestamp,
      numDownloads: group.map(q => q.numDownloads).reduce((a,b) => a+b, 0),
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

const calendar = (req, res, next) => {
  cal.getWeekWithTime()
  .then(data => {
    if (!data) {
      const error = new Error('Error fetching HS Calendar');
      next(error);
      return;
    }
    res.json(data);
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
  err.status = err.status || 500
  res.status(err.status).json(err);
}

exports.latest = asyncWrapper(latest);
exports.show = asyncWrapper(show);
exports.calendar = calendar;
exports.errorHandler = errorHandler;
