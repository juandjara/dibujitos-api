require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const logger = require('morgan')
const pkg = require('./package.json')
const {si} = require('nyaapi')
const {parseTorrentGroup, groupBy, fetchMetadata} = require('./utils')

const app = express()

app.set('json spaces', 2)
app.use(cors())
app.use(helmet())
app.use(logger('tiny'))

app.get('/', (req, res) => {
  res.json({
    name: pkg.name,
    version: pkg.version,
    descriptipn: pkg.descriptipn
  })
})

const sourceMap = {
  hs: 'HorribleSubs',
  py: 'puyero'
}

app.get('/latest', (req, res, next) => {
  // page is added 1 to get 0-based paging
  // rpp is multipled by 3 because results will be grouped
  si.searchByUserAndByPage({
    user: sourceMap[req.query.source || 'hs'],
    term: req.query.q,
    p: (req.query.page || 0) + 1,
    n: (req.query.rpp || 20) * 3,
    filter: 2
  }).then(data => {
    const grouped = groupBy(
      parseTorrentGroup(data),
      item => item.showTitle + item.episodeNumber
    );
    const flattened = Object.keys(grouped).map(key => grouped[key][0])
    const promises = flattened.map(torrent => (
      fetchMetadata(torrent.slug).then(metadata => ({
        metadata: {
          ...metadata,
          slug: undefined
        },
        torrentInfo: torrent,
      }))
    ))
    return Promise.all(promises).then(withMetadata => {
      res.json(withMetadata);
    })
  }).catch(next);
})

app.get('/show/:slug', (req, res, next) => {
  const showName = req.params.slug.replace(/-/g, '');
  si.searchByUserAndByPage({
    user: sourceMap[req.query.source || 'hs'],
    term: showName,
    p: (req.query.page || 0) + 1,
    n: (req.query.rpp || 20) * 3,
    filter: 2
  })
})

// global error handler
// is reached when some previous handler function calls next with an error
app.use((err, req, res, next) => {
  if (process.env.ENV === 'dev') {
    console.error(err)
  } else {
    console.error(err.message)
    err.message = "Internal server error"
  }
  let status = err.status || 500
  res.status(status)
     .json({name: err.name, status, error: err.message});
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`> app is listening at port ${port}`);
})