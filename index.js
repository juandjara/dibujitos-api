require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const logger = require('morgan')
const pkg = require('./package.json')
const {latest, show, calendar, errorHandler} = require('./routes');

const app = express()

app.set('json spaces', 2)
app.use(cors())
app.use(helmet())
app.use(logger('tiny'))

app.get('/', (req, res) => {
  res.json({
    name: pkg.name,
    version: pkg.version,
    descriptipn: pkg.descriptipn,
    endpoints: [
      '/latest?source=&page=&rpp=&q=',
      '/show/:slug?source=&page=&rpp=&meta=',
      '/calendar'
    ]
  })
})

app.get('/latest', latest)
app.get('/show/:slug', show)
app.get('/calendar', calendar)

app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`> app is listening at port ${port}`);
})