'use strict'
const Controller = require('egg').Controller
const path = require('path')
const fs = require('fs')

// const pump = require('mz-modules/pump')

class uploadController extends Controller {
  async uploadImg() {
    const { ctx } = this
    const { putFile } = ctx.helper.ossUtil
    const file = ctx.request.files[0]
    const { getRandomNumber } = ctx.helper.util
    const name = 'img/' + getRandomNumber() + '.' + path.basename(file.filename)
      .substr(path.basename(file.filename)
        .lastIndexOf('.') + 1, path.basename(file.filename).length)
    let result
    try {
      result = await putFile(name, file.filepath)
    } catch (e) {
      console.error(e)
    } finally {
      ctx.cleanupRequestFiles()
    }

    ctx.body = {
      url: 'public/' + result.name,
      requestBody: ctx.request.body
    }
  }

  async uploadTestData() {
    const { ctx } = this
    const { inputData } = ctx.request.body
    const { getRandomNumber } = ctx.helper.util
    const filename = 'inputData/' + getRandomNumber() + '.in'
    try {
      fs.writeFileSync(path.join(__dirname, '../public/' + filename), inputData)
      ctx.body = {
        code: 1,
        data: filename
      }
    } catch (e) {
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }
}

module.exports = uploadController
