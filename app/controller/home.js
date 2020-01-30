'use strict'

const Controller = require('egg').Controller

const shell = require('shelljs')
const path = require('path')
const fs = require('fs')

class HomeController extends Controller {
  async index() {
    const { ctx } = this
    ctx.body = 'hi, egg'
  }

  async ide() {
    const { ctx } = this
    const { code, inputData } = ctx.request.body
    const fileName = 'HelloWorld.java'
    fs.writeFileSync(path.join(__dirname + '/../public/java/' + fileName), code, { flags: 'w+' })
    shell.exec(`javac app/public/java/${fileName}`)
    const child = shell.exec('java HelloWorld', { async: true })
    const output = await new Promise(resolve => {
      child.stdout.on('data', data => {
        resolve(data)
      })
      child.stdin.write(inputData)
      child.stdin.end()
    })
    return ctx.body = {
      code: 1,
      data: {
        output
      }
    }
  }
}

module.exports = HomeController
