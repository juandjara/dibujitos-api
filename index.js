require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const logger = require('morgan')
const pkg = require('./package.json')
const {si} = require('nyaapi')
const {parseTorrent, groupBy, fetchMetadata} = require('./utils')

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

app.get('/latest', (req, res, next) => {
  const sourceMap = {
    hs: 'HorribleSubs',
    py: 'puyero'
  }
  si.searchByUserAndByPage({
    user: sourceMap[req.query.source || 'hs'],
    term: '',
    p: req.query.page || 1,
    n: req.query.rpp || 60,
    filter: 2
  }).then(data => {
    const grouped = groupBy(
      data.map(parseTorrent)
        .filter(t => !t.isBatch)
        .map(t => {
          delete t.isBatch;
          return t;
        }),
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