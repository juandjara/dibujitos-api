const slug = require('slug')
const {promisify} = require('util')
const kitsu = require('node-kitsu')
const redis = require('redis')
const cacheDB = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_HOST
)
cacheDB.on('error', (err) => {
  console.error(err);
})
const cacheGet = promisify(cacheDB.get).bind(cacheDB)
const cacheSet = promisify(cacheDB.setex).bind(cacheDB)
const CACHE_EXPIRE_TIME = 60 * 60 * 24 * 2; // 2 days

function filterMetadata(meta) {
  return {
    canonicalTitle: meta.canonicalTitle,
    titles: meta.titles,
    abbreviatedTitles: meta.abbreviatedTitles,
    description: meta.synopsis,
    startDate: meta.startDate,
    endDate: meta.endDate,
    status: meta.status,
    posterImage: meta.posterImage,
    coverImage: meta.coverImage,
    episodeCount: meta.episodeCount,
    episodeLength: meta.episodeLength,
    youtubeVideoId: meta.youtubeVideoId
  };
}

async function fetchMetadata(slug) {
  const cached = await cacheGet(slug);
  if(cached) {
    return filterMetadata(JSON.parse(cached));
  }
  const response = await kitsu.searchAnime(slug, 0);
  if(!response.length) {
    return Promise.reject(new Error(`[utils.fetchMetadata] ERROR: Anime not found for slug ${slug}`))
  }
  const data = {
    ...response[0].attributes,
    id: response[0].id
  }
  await cacheSet(slug, CACHE_EXPIRE_TIME, JSON.stringify(data));
  return filterMetadata(data);
}

function parseTorrent(torrent) {
  const parts = getNameParts(torrent.name);
  if(!parts.episodeNumber && !parts.isBatch) {
    console.warn(`Found torrent with no epNumber \n TORRENT: \n`, torrent, '\n PARTS: \n', parts)
  }
  return {
    fileSize: torrent.fileSize,
    timestamp: parseInt(torrent.timestamp) * 1000,
    seeds: parseInt(torrent.seeders),
    peers: parseInt(torrent.leechers),
    numDownloads: parseInt(torrent.nbDownload),
    link: torrent.links.magnet,
    showTitle: parts.showTitle,
    slug: slug(parts.showTitle, {lower: true, remove: null}),
    episodeNumber: parseInt(parts.episodeNumber),
    quality: parts.quality,
    isBatch: parts.isBatch,
    fullTitle: torrent.name
  }
}

function parseTorrentGroup(group) {
  return group.map(parseTorrent)
  .filter(t => !t.isBatch)
  .map(t => {
    delete t.isBatch;
    return t;
  })
}

function getNameParts(name) {
  const parts = name.replace(/]/g, "[")
    .split("[")
    .filter(Boolean)
    .map(s => s.trim())
  const user = parts[0];
  const title = parts[1];
  const qualityMatch = name.match(/\d{1,4}p/)
  const quality = qualityMatch && qualityMatch[0];
  const isBatch = !!name.match(/([Bb]atch)|([\(\[]\d+-\d+[\)\]])/)
  let showTitle = title;
  let episodeNumber = '';
  if(!isBatch) {
    const episodeIndex = title.lastIndexOf(' - ');
    if(episodeIndex !== -1) {
      showTitle = title.substr(0, episodeIndex)
      episodeNumber = title.substr(episodeIndex + 3);
    } 
  }
  return {
    user,
    showTitle,
    episodeNumber,
    quality,
    isBatch,
  }
}

function groupBy(array, predicate) {
  const cb = typeof predicate === 'function' ? predicate : (o) => o[predicate];

  return array.reduce(function(groups, item) {
    const val = cb(item)
    groups[val] = groups[val] || []
    groups[val].push(item)
    return groups
  }, {})
}

exports.groupBy = groupBy;
exports.parseTorrent = parseTorrent;
exports.parseTorrentGroup = parseTorrentGroup;
exports.getNameParts = getNameParts;
exports.fetchMetadata = fetchMetadata;
