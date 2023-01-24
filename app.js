const express = require('express')
const responseTime = require('response-time')
const redis = require('redis')
const axios = require('axios')

const runApp = async () => {

  // connect to redis
  const client = redis.createClient()
  client.on('error', (err) => console.log('Redis Client Error', err));
  await client.connect();
  console.log('Redis connected!')

  
  const app = express()
  // add response-time to requests
  app.use(responseTime())

  app.get('*', async (req, res) => {

    try {
        path=req.path

      // check if the request is already stored in the cache, if so, return the response
      const caches = await client.get(`${path}`)
      if (caches) {
        return res.json(JSON.parse(caches))
      }

      // makes the request to the API
      const response = await axios.get(`https://discovery.mysterium.network${path}`)

      /* Another way to save the data is to save it with the name of the requets url, with the property
       req.originalUrl which would be the same as '/character'
       await client.set(req.originalUrl, JSON.stringify(response.data))
      */

      // save the response in the cache
      await client.set(`${path}`, JSON.stringify(response.data))
      return res.status(200).json(response.data)

    } catch (err) {
        console.log(err)
      return res.status(err.response.status).json({ mmessage: err.mmessage })
    }

  })

  app.listen(process.env.PORT || 3000, () => {
    console.log(`server on port 3000`)
  })

}

runApp()
