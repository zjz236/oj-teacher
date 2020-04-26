'use strict'

const Controller = require('egg').Controller
const ObjectID = require('mongodb').ObjectID
const NodeRSA = require('node-rsa')

class accountController extends Controller {
  async login() {
    const { ctx, app } = this
    let { username, password, publicKey } = ctx.request.body
    const { md5Update, loginToken } = ctx.helper.util
    const mongo = app.mongo.get('oj')
    try {
      const { value } = await mongo.findOneAndDelete('cert', {
        filter: {
          publicKey
        }
      })
      if (!value) {
        return ctx.body = {
          code: 0,
          msg: '系统异常，请重试'
        }
      }
      const privateKey = new NodeRSA(value.privateKey)
      privateKey.setOptions({ encryptionScheme: 'pkcs1' })
      console.log(privateKey)
      password = privateKey.decrypt(password, 'utf8')
      const result = await mongo.findOne('user', {
        query: {
          username,
          password: md5Update(password)
        }
      })
      if (result && result.username) {
        const token = loginToken({ username: result.username, userId: result._id }, 3 * 60 * 60)
        await mongo.deleteMany('loginToken', {
          filter: {
            userId: result._id
          }
        })
        await mongo.insertOne('loginToken', {
          doc: {
            userId: result._id,
            token
          }
        })
        ctx.body = {
          code: 1,
          msg: '登录成功',
          token
        }
      } else {
        ctx.body = {
          code: 0,
          msg: '用户名或密码错误'
        }
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常，请重试'
      }
    }
  }

  async getPublicKey() {
    const { ctx, app } = this
    try {
      const key = new NodeRSA({ b: 1024 })
      key.setOptions({ encryptionScheme: 'pkcs1' })
      const mongo = app.mongo.get('oj')
      const publicKey = key.exportKey('pkcs8-public')
      const privateKey = key.exportKey('pkcs8-private')
      const { insertedId } = await mongo.insertOne('cert', {
        doc: {
          publicKey,
          privateKey
        }
      })
      if (insertedId) {
        ctx.body = {
          code: 1,
          msg: 'success',
          data: publicKey
        }
      } else {
        ctx.body = {
          code: 0,
          msg: '系统异常'
        }
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }

  async addUser() {
    const { ctx, app } = this
    const { md5Update } = ctx.helper.util
    const mongo = app.mongo.get('oj')
    let { username, password, trueName, sex, school, email, editable, userId, publicKey } = ctx.request.body
    try {
      const { value } = await mongo.findOneAndDelete('cert', {
        filter: {
          publicKey
        }
      })
      if (!value) {
        return ctx.body = {
          code: 0,
          msg: '系统异常，请重试'
        }
      }
      const privateKey = new NodeRSA(value.privateKey)
      privateKey.setOptions({ encryptionScheme: 'pkcs1' })
      password = privateKey.decrypt(password, 'utf8')
      const find = await mongo.findOne('user', {
        query: Object.assign({ username }, editable ? { _id: { $ne: ObjectID(userId) } } : {})
      })
      if (find) {
        ctx.body = {
          code: 0,
          msg: '用户已存在'
        }
        return
      }
      if (editable) {
        const { value } = await mongo.findOneAndUpdate('user', {
          filter: { _id: ObjectID(userId) },
          update: {
            $set: {
              username, password: md5Update(password), trueName, sex, school, email
            }
          }
        })
        await mongo.findOneAndDelete('cert', {
          filter: {
            publicKey
          }
        })
        if (value) {
          ctx.body = {
            code: 1,
            msg: '修改成功'
          }
        } else {
          ctx.body = {
            code: 0,
            msg: '修改失败'
          }
        }
        return
      }
      const result = await mongo.insertOne('user', {
        doc: {
          username,
          password: md5Update(password),
          trueName,
          sex,
          school,
          email,
          isAdmin: false,
          createTime: new Date()
        }
      })
      if (result.insertedCount) {
        await mongo.findOneAndDelete('cert', {
          filter: {
            publicKey
          }
        })
        ctx.body = {
          code: 1,
          msg: '添加成功'
        }
      } else {
        ctx.body = {
          code: 0,
          msg: '添加失败'
        }
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常，请重试'
      }
    }
  }

  async getUserList() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      let { pageSize, pageNo, search } = ctx.request.query
      search = search ? search : ''
      const reg = new RegExp(search)
      console.log(reg)
      const total = await mongo.countDocuments('user', {
        query: {
          trueName: {
            $regex: reg
          }
        }
      })
      const result = await mongo.find('user', {
        query: {
          trueName: {
            $regex: reg
          }
        },
        projection: {
          username: 1, trueName: 1, sex: 1, school: 1, email: 1, isAdmin: 1, createTime: 1
        },
        limit: parseInt(pageSize),
        skip: (parseInt(pageNo) - 1) * parseInt(pageSize)
      })
      ctx.body = {
        code: 1,
        msg: 'success',
        data: {
          list: result,
          total
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  async getUserInfo() {
    const { ctx, app } = this
    let { userId } = ctx
    const mongo = app.mongo.get('oj')
    ctx.request.query.userId && (userId = ctx.request.query.userId)
    try {
      const result = await mongo.findOne('user', {
        query: {
          _id: ObjectID(userId)
        },
        options: {
          projection: {
            username: 1, trueName: 1, sex: 1, school: 1, email: 1, isAdmin: 1, createTime: 1
          }
        }
      })
      ctx.body = {
        msg: 'success',
        code: 1,
        data: {
          ...result
        }
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        msg: '系统异常，请重试',
        code: 0
      }
    }
  }

  async deleteUser() {
    const { ctx } = this
    const { userId } = ctx.request.query
    try {
      const { deleteUser } = ctx.helper.deleteUtil
      await deleteUser({ userId })
      ctx.body = {
        msg: '删除成功',
        code: 1
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        msg: '系统异常，请重试',
        code: 0
      }
    }
  }
}

module.exports = accountController
