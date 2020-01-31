'use strict'
const Controller = require('egg').Controller
const path = require('path')

// const pump = require('mz-modules/pump')

class uploadController extends Controller {
  async uploadImg() {
    const { ctx } = this
    const { putFile } = ctx.helper.ossUtil
    const file = ctx.request.files[0]
    const name = 'img/' + path.basename(file.filename)
    let result
    try {
      result = await putFile(name, file.filepath)
    } catch (e) {
      console.error(e)
    } finally {
      ctx.cleanupRequestFiles()
    }

    ctx.body = {
      url: result.url,
      requestBody: ctx.request.body
    }
  }
}

module.exports = uploadController
