'use strict'

const Controller = require('egg').Controller
const fs = require('fs')
const path = require('path')
const ObjectID = require('mongodb').ObjectID

class IDEController extends Controller {
  async addIDEData() {
    const { ctx, app } = this
    try {
      const { code, language, inputData } = ctx.request.body
      const mongo = app.mongo.get('oj')
      const { getRandomNumber } = ctx.helper.util
      let inputFile = ''
      if (inputData) {
        inputFile = 'inputData/' + getRandomNumber() + '.in'
        fs.writeFileSync(path.join(__dirname, '../public/' + inputFile), inputData)
      }
      const result = await mongo.insertOne('processResult', {
        doc: {
          code,
          language,
          inputFile,
          status: 'Queuing',
          isIDE: true
        }
      })
      if (result.insertedId) {
        ctx.body = {
          code: 1,
          msg: 'success',
          data: {
            insertedId: result.insertedId
          }
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

  async getIDEData() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    const { id } = ctx.request.query
    const result = await mongo.findOne('processResult', {
      query: {
        _id: ObjectID(id)
      }
    })
    if (result) {
      ctx.body = {
        code: 1,
        msg: 'success',
        data: result
      }
    } else {
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }
}

module.exports = IDEController
