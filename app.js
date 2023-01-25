const express = require('express')
const responseTime = require('response-time')
const redis = require('redis')
const axios = require('axios')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
async function startredis() {
  try {
      await exec('redis-server /etc/redis/redis.conf');
  }catch (err) {
     console.error(err);
  };
};
async function clearredis() {
  try {
    const { stdout } = await exec('redis-cli DBSIZE');
    const size = parseInt(stdout);
    if (size > 0) {
        await exec('redis-cli FLUSHDB');
        console.log('Redis cache flushed!');
    } else {
        console.log('Redis cache is empty, nothing to flush');
    }
} catch (err) {
    console.log(err);
}
}
const runApp = async () => {
  await startredis();
  // connect to redis
  const client = redis.createClient()
  client.on('error', (err) => console.log('Redis Client Error', err));
  await client.connect();
  console.log('Redis connected!')
  setInterval(clearredis, 600000);
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
