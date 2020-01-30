'use strict'

const Controller = require('egg').Controller

class accountController extends Controller {
  async login() {
    const { ctx, app } = this
    const { username, password } = ctx.request.body
    const { md5Update, loginToken } = ctx.helper.util
    const mongo = app.mongo.get('oj')
    try {
      const result = await mongo.findOne('user', {
        query: {
          username,
          password: md5Update(password)
        }
      })
      if (result && result.username) {
        const token = loginToken({ username: result.username, userId: result._id }, 7200)
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

  async addUser() {
    const { ctx, app } = this
    const { md5Update } = ctx.helper.util
    const mongo = app.mongo.get('oj')
    const { username, password, trueName, sex, school, email } = ctx.request.body
    try {
      const find = await mongo.find('user', {
        query: {
          username
        }
      })
      if (find && find.length) {
        ctx.body = {
          code: 0,
          msg: '用户已存在'
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
      if (result.ok) {
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

  async getUserInfo() {
    const { ctx, app } = this
    const { userId } = ctx
    const mongo = app.mongo.get('oj')
    try {
      const result = await mongo.findOne('user', {
        query: {
          _id: userId
        },
        options: {
          projection: {
            _id: 0, username: 1, trueName: 1, sex: 1, school: 1, email: 1, isAdmin: 1, createTime: 1
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
}

module.exports = accountController
