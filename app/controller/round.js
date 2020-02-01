'use strict'
const Controller = require('egg').Controller
const fs = require('fs')
const path = require('path')
const shell = require('shelljs')

class downloadController extends Controller {
  async runner() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    setTimeout(() => runner(), 0)
    setTimeout(() => runner(), 10)
    setTimeout(() => runner(), 20)
    setTimeout(() => runner(), 30)

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
        filePath = path.join(__dirname, '../public/code/c/')
        fs.writeFileSync(filePath + fileName + '.c', code)
        const res = shell.exec(`gcc ${fileName + '.c'} -o ${fileName + '.o'}`, { async: false, cwd: filePath })
        if (res.code) {
          let error = res.stderr
          const reg = new RegExp(`${filePath + fileName + '.c'}:`, 'g')
          error = error.replace(reg, '')
          console.log(error)
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
        filePath = path.join(__dirname, '../public/code/cpp/')
        fs.writeFileSync(filePath + fileName + '.cpp', code)
        const res = shell.exec(`g++ ${fileName + '.cpp'} -o ${fileName + '.o'}`, { async: false, cwd: filePath })
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
        filePath = path.join(__dirname, '../public/code/java/' + fileName + '/')
        fs.mkdirSync(filePath)
        fs.writeFileSync(filePath + 'Main.java', code)
        const res = shell.exec(`javac ${'Main.java'}`, { async: false, cwd: filePath })
        if (res.code) {
          const error = res.stderr
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
      } else if (language === 'python') {
        filePath = path.join(__dirname, '../public/code/python/')
        fs.writeFileSync(filePath + fileName + '.py', code)
      }
      let runShell = ''
      switch (language) {
        case 'c':
          runShell = './' + fileName + '.o'
          break
        case 'cpp':
          runShell = './' + fileName + '.o'
          break
        case 'java':
          runShell = 'java Main'
          break
        default:
          runShell = `python3 ${fileName}.py`
          break
      }
      console.log('runShell', runShell)
      const runnerResult = await new Promise(resolve => {
        const child = shell.exec(runShell, {
          // silent: true,
          async: true,
          timeout: 10000,
          cwd: filePath
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
          console.log(outputResult)
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
      let testShell = ''
      switch (language) {
        case 'c':
          testShell = filePath + fileName + '.o'
          break
        case 'cpp':
          testShell = filePath + fileName + '.o'
          break
        case 'java':
          testShell = `java,-cp,${filePath},Main`
          break
        default:
          testShell = `python3,${filePath + fileName}.py`
          break
      }
      const child = shell.exec(`python ${path.join(__dirname, '../source/test.py')} ${testShell} ${inputFile} outputData/${fileName}.out`, {
        silent: true,
        timeout: 10000
      })
      if (child.stdout) {
        console.log(child.stdout.replace('/n', ''))
        const result = JSON.parse(child.stdout.replace('/n', ''))
        console.log(result, child.stdout.replace('/n', ''))
      }
      setTimeout(() => runner(), 10)
      fs.unlinkSync(path.join(__dirname, '../public/outputData/' + fileName + '.out'))
      switch (language) {
        case 'c':
          fs.unlinkSync(filePath + fileName + '.c')
          fs.unlinkSync(filePath + fileName + '.o')
          break
        case 'cpp':
          fs.unlinkSync(filePath + fileName + '.cpp')
          fs.unlinkSync(filePath + fileName + '.o')
          break
        case 'java':
          fs.unlinkSync(filePath + 'Main.java')
          fs.unlinkSync(filePath + 'Main.class')
          fs.rmdirSync(path.join(__dirname, '../public/code/java/' + fileName))
          break
        default:
          fs.unlinkSync(filePath + fileName + '.py')
          break
      }
    }
  }
}

module.exports = downloadController
