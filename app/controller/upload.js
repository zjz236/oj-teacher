'use strict'
const Controller = require('egg').Controller
const path = require('path')

// const pump = require('mz-modules/pump')

class uploadController extends Controller {
  async uploadImg() {
    const { ctx } = this
    const file = ctx.request.files[0]
    const name = 'images/' + path.basename(file.filename)
    let result
    try {
      result = await ctx.oss.put(name, file.filepath)
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
