const slug = require('slug')

function parseTorrent(torrent) {
  const parts = getNameParts(torrent.name);
  return {
    fileSize: torrent.fileSize,
    timestamp: parseInt(torrent.timestamp),
    seeders: parseInt(torrent.seeders),
    leechers: parseInt(torrent.leechers),
    numDownloads: parseInt(torrent.nbDownload),
    link: torrent.links.magnet,
    showTitle: parts.showTitle,
    slug: slug(parts.showTitle).toLowerCase(),
    episodeNumber: parts.episodeNumber,
    quality: parts.quality,
    isBatch: parts.isBatch,
    fullTitle: torrent.name
  }
}

function getNameParts(name) {
  const parts = name.replace(/]/g, "[")
    .split("[")
    .filter(Boolean)
    .map(s => s.trim())
  const user = parts[0];
  const title = parts[1];
  const quality = parts[2];
  const isBatch = parts.some(
    part => part === '(Batch)' || part === 'Batch'
  );
  let showTitle = '';
  let episodeNumber = '';
  if(isBatch) {
    showTitle = title.replace(/ \(.*/, ""); 
  } else {
    const episodeIndex = title.lastIndexOf(' - ');
    showTitle = title.substr(0, episodeIndex)
    episodeNumber = title.substr(episodeIndex + 3);
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

exports.parseTorrent = parseTorrent;
exports.getNameParts = getNameParts;
exports.groupBy = groupBy;
