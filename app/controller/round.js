'use strict'
const Controller = require('egg').Controller
const fs = require('fs')
const path = require('path')
const shell = require('shelljs')

class downloadController extends Controller {
  async runner() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    runner()

    async function runner() {
      const { value } = await mongo.findOneAndUpdate('processResult', {
        filter: {
          status: 'Queuing'
        },
        update: {
          $set: {
            status: 'Running'
          }
        },
        options: {
          sort: {
            _id: 1
          }
        }
      })
      if (!value) {
        setTimeout(() => runner(), 500)
        return
      }
      const { code, inputFile, outputFile, language, runnerStatus } = value
      const { getRandomNumber } = ctx.helper.util
      const fileName = getRandomNumber()
      let filePath
      if (language === 'c') {
        filePath = path.join(__dirname, '../source/code/c/')
        fs.writeFileSync(filePath + getRandomNumber + '.c', code)
        const res = shell.exec(`gcc ${filePath + fileName + '.c'} -o ${filePath + fileName + '.o'}`, { async: false })
        if (res.code) {
          let error = res.stderr
          const reg = new RegExp(`${filePath + fileName + '.c'}:`, 'g')
          error = error.replace(reg, '')
          await mongo.findOneAndUpdate('processResult', {
            filter: {
              _id: value._id
            },
            update: {
              $set: {
                errMsg: error,
                status: 'Compile Error'
              }
            }
          })
          setTimeout(() => runner(), 500)
          return
        }
      } else if (language === 'cpp') {
        filePath = path.join(__dirname, '../source/code/cpp/')
        fs.writeFileSync(filePath + fileName + '.cpp', code)
        const res = shell.exec(`gcc ${filePath + fileName + '.cpp'} -o ${filePath + fileName + '.o'}`, { async: false })
        if (res.code) {
          let error = res.stderr
          const reg = new RegExp(`${filePath + fileName + '.cpp'}:`, 'g')
          error = error.replace(reg, '')
          await mongo.findOneAndUpdate('processResult', {
            filter: {
              _id: value._id
            },
            update: {
              $set: {
                errMsg: error,
                status: 'Compile Error'
              }
            }
          })
          setTimeout(() => runner(), 500)
          return
        }
      } else if (language === 'java') {
        filePath = path.join(__dirname, '../source/code/java/' + fileName + '/')
        fs.mkdirSync(filePath)
        fs.writeFileSync(filePath + 'Main.java', code)
        const res = shell.exec(`javac ${filePath + 'Main.java'}`, { async: false })
        if (res.code) {
          let error = res.stderr
          const reg = new RegExp(`${filePath + 'Main.java'}:`, 'g')
          error = error.replace(reg, '')
          await mongo.findOneAndUpdate('processResult', {
            filter: {
              _id: value._id
            },
            update: {
              $set: {
                errMsg: error,
                status: 'Compile Error'
              }
            }
          })
          setTimeout(() => runner(), 500)
          return
        }
      } else if (language === 'java') {
        filePath = path.join(__dirname, '../source/code/python/')
        fs.writeFileSync(filePath + fileName + '.py', code)
      }
      let runShell = ''
      switch (language) {
        case 'c':
          runShell = filePath + fileName + '.o'
          break
        case 'cpp':
          runShell = filePath + fileName + '.o'
          break
        case 'java':
          runShell = `java ${filePath}Main`
          break
        default:
          runShell = `python3 ${filePath + fileName}.py`
          break
      }
      const runnerResult = await new Promise(resolve => {
        const child = shell.exec(runShell, {
          silent: true,
          async: true,
          timeout: 3000
        })
        child.on('error', err => {
          resolve({
            code: 1,
            err
          })
        })
        const inputData = inputFile ? fs.readFileSync(path.join(__dirname, '../public/' + inputFile)) : ''
        child.stdin.write(inputData)
        child.stdin.end()
        let outputResult = ''
        child.stdout.on('data', data => {
          outputResult += data
        })
        child.on('close', () => {
          resolve({
            code: 0,
            output: outputResult
          })
        })
      })
      if (runnerResult.code) {
        const error = runnerResult.err
        await mongo.findOneAndUpdate('processResult', {
          filter: {
            _id: value._id
          },
          update: {
            $set: {
              errMsg: error,
              status: 'Compile Error'
            }
          }
        })
        setTimeout(() => runner(), 500)
        return
      }
      await mongo.findOneAndUpdate('processResult', {
        filter: {
          _id: value._id
        },
        update: {
          $set: {
            outputData: runnerResult.output,
            status: 'Running'
          }
        }
      })
      fs.writeFileSync(path.join(__dirname, '../public/outputData/' + fileName + '.out'), runnerResult.output)
      const child = shell.exec(`python ${path.join(__dirname, '../source/loRun.py')} ${runShell} ${inputFile} outputData/${fileName}.out`, {
        silent: true,
        timeout: 10000
      })
      console.log(child.stdout)
    }
  }
}

module.exports = downloadController
