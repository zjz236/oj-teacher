'use strict'
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken') // 引入jsonwebtoken
const ObjectID = require('mongodb').ObjectID

// 解密，验证
const verifyToken = token => {
  const cert = fs.readFileSync(path.join(__dirname, '../source/cert/rsa_public_key.pem')) // 公钥，看后面生成方法
  let res = ''
  try {
    const result = jwt.verify(token, cert, { algorithms: [ 'RS256' ] }) || {}
    const { exp } = result,
      current = Math.floor(Date.now() / 1000)
    if (current <= exp) res = result.data || {}
  } catch (e) {
    console.error(e)
  }
  return res
}
const getToken = cookies => {
  if (!cookies || typeof cookies !== 'string') {
    return ''
  }
  const cookieArray = cookies.split(';')
  const cookieObject = {}
  for (const item of cookieArray) {
    const obj = item.trim()
      .split('=')
    cookieObject[obj[0]] = obj[1]
  }
  return cookieObject.token
}
module.exports = (options, app) => {
  return async function userInterceptor(ctx, next) {
    const authToken = getToken(ctx.headers.cookie) // 获取header里的authorization
    if (authToken) {
      const res = verifyToken(authToken) // 解密获取的Token
      if (res.userId) {
        // 如果需要限制单端登陆或者使用过程中废止某个token，或者更改token的权限。也就是说，一旦 JWT 签发了，在到期之前就会始终有效
        // 此处使用mysql进行保存
        const mongo = app.mongo.get('oj')
        const mongo_token = await mongo.findOne('loginToken', {
          query: {
            userId: ObjectID(res.userId)
          }
        }) // 获取保存的token
        if (!mongo_token) {
          // eslint-disable-next-line no-return-assign
          return ctx.body = { code: -1, msg: '请登陆后再进行操作' }
        }
        if (authToken === mongo_token.token) {
          ctx.username = res.username
          ctx.userId = ObjectID(res.userId)
          await next()
        } else {
          ctx.body = { code: -1, msg: '您的账号已在其他地方登录' }
        }
      } else {
        ctx.body = { code: -1, msg: '登录状态已过期' }
      }
    } else {
      ctx.body = { code: -1, msg: '请登陆后再进行操作' }
    }
  }
}
