'use strict'
const fs = require('fs')
const path = require('path')
const Controller = require('egg').Controller

class downloadController extends Controller {
  async downloadSome() {
    const { ctx } = this
    const { type, filename } = ctx.params
    const filePath = path.join(__dirname, `../public/${type}/${filename}`)
    if (!fs.existsSync(filePath)) return
    ctx.set('Content-disposition', 'attachment; filename=' +
      filename)
    const fileType = filename.substr(filename.lastIndexOf('.') + 1, filename.length - 1)
    ctx.set('Content-type', 'application/' + fileType)
    ctx.body = fs.readFileSync(filePath)
  }
}

module.exports = downloadController
