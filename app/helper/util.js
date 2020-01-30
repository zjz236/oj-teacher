'use strict'
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const { cppRunner, cRunner, javaRunner, pythonRunner, getRandomNumber } = require('../util/languageCommon')
module.exports = app => {
  return {
    md5Update(data) {
      const crypto = require('crypto')
      const md5 = crypto.createHash('md5')
      return md5.update(data)
        .digest('hex')
    },
    loginToken(data, expires = 7200) {
      const exp = Math.floor(Date.now() / 1000) + expires
      const cert = fs.readFileSync(path.join(__dirname, '../public/cert/rsa_private_key.pem')) // 私钥，看后面生成方法
      return jwt.sign({ data, exp }, cert, { algorithm: 'RS256' })
    },
    readUsername(data) {
      const username = new Set()
      for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
          if (data[i].username === data[j].username) {
            username.add(data[i].username)
          }
        }
      }
      return Array.from(username)
        .join(',')
    },
    getRandomNumber,
    codeRunner({ code, inputData, language }) {
      return new Promise(async resolve => {
        const mongo = app.mongo.get('oj')
        let result
        await new Promise(async resolve => {
          result = await mongo.find('processNum')
          if (result[0].num < 5) {
            await mongo.findOneAndUpdate('processNum', {
              filter: {
                _id: result[0]._id
              },
              update: {
                $inc: { num: 1 }
              }
            })
            resolve(true)
            return
          }
          let time = null
          time = setInterval(async () => {
            const result = await mongo.find('processNum')
            if (result[0].num < 5) {
              await mongo.findOneAndUpdate('processNum', {
                filter: {
                  _id: result[0]._id
                },
                update: {
                  $inc: { num: 1 }
                }
              })
              resolve(true)
              clearInterval(time)
            }
          }, 500)
        })
        let res = {}
        switch (language) {
          case 'cpp':
            res = await cppRunner(code, inputData)
            break
          case 'c':
            res = await cRunner(code, inputData)
            break
          case 'java':
            res = await javaRunner(code, inputData)
            break
          default:
            res = await pythonRunner(code, inputData)
            break
        }
        await mongo.findOneAndUpdate('processNum', {
          filter: {
            _id: result[0]._id
          },
          update: {
            $inc: { num: -1 }
          }
        })
        resolve(res)
      })

    }
  }
}
