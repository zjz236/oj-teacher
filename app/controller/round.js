'use strict'
const Controller = require('egg').Controller
const fs = require('fs')
const path = require('path')
const shell = require('shelljs')
const ObjectID = require('mongodb').ObjectID

class roundController extends Controller {
  async runner() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    const { userId } = ctx
    const user = await mongo.findOne('user', {
      query: {
        isAdmin: true,
        _id: ObjectID(userId)
      }
    })
    if (!user) {
      return ctx.body = {
        code: 0,
        msg: '您无权进行操作'
      }
    }
    try {
      const { status } = ctx.request.body
      await mongo.findOneAndUpdate('processStatus', {
        filter: {},
        update: {
          $set: {
            status
          }
        }
      })
    } catch (e) {
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }

    setTimeout(() => runner(), 0)
    setTimeout(() => runner(), 10)
    setTimeout(() => runner(), 20)
    setTimeout(() => runner(), 30)
    ctx.body = {
      code: 1,
      msg: 'success'
    }

    async function runner() {
      const pause = await mongo.findOne('processStatus', {})
      try {
        if (!pause.status) {
          setTimeout(() => runner(), 500)
          return
        }
        if (!pause.num >= 4) {
          setTimeout(() => runner(), 500)
          return
        }
        await mongo.findOneAndUpdate('processStatus', {
          filter: {
            _id: pause._id
          },
          update: {
            $inc: { num: 1 }
          }
        })
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
          await mongo.findOneAndUpdate('processStatus', {
            filter: {
              _id: pause._id
            },
            update: {
              $inc: { num: -1 }
            }
          })
          setTimeout(() => runner(), 500)
          return
        }
        const { code, inputFile, outputFile, language, isIDE, timeLimit, memoryLimit } = value
        const { getRandomNumber } = ctx.helper.util
        const { deleteFile } = ctx.helper.ossUtil
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
            await mongo.findOneAndUpdate('processStatus', {
              filter: {
                _id: pause._id
              },
              update: {
                $inc: { num: -1 }
              }
            })
            if (isIDE) {
              deleteFile(inputFile)
                .catch(e => e)
              deleteFile(outputFile)
                .catch(e => e)
            }
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
            await mongo.findOneAndUpdate('processStatus', {
              filter: {
                _id: pause._id
              },
              update: {
                $inc: { num: -1 }
              }
            })
            if (isIDE) {
              deleteFile(inputFile)
                .catch(e => e)
              deleteFile(outputFile)
                .catch(e => e)
            }
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
            await mongo.findOneAndUpdate('processStatus', {
              filter: {
                _id: pause._id
              },
              update: {
                $inc: { num: -1 }
              }
            })
            if (isIDE) {
              deleteFile(inputFile)
                .catch(e => e)
              deleteFile(outputFile)
                .catch(e => e)
            }
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
          await mongo.findOneAndUpdate('processStatus', {
            filter: {
              _id: pause._id
            },
            update: {
              $inc: { num: -1 }
            }
          })
          if (isIDE) {
            deleteFile(inputFile)
              .catch(e => e)
            deleteFile(outputFile)
              .catch(e => e)
          }
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
        child.stdout = '{\'memoryused\': 10916L, \'timeused\': 10000L, \'result\': 0L}\n'
        if (!child.stdout) {
          await mongo.findOneAndUpdate('processStatus', {
            filter: {
              _id: pause._id
            },
            update: {
              $inc: { num: -1 }
            }
          })
          if (isIDE) {
            deleteFile(inputFile)
              .catch(e => e)
            deleteFile(outputFile)
              .catch(e => e)
          }
          setTimeout(() => runner(), 500)
          return
        }
        if (child.stdout) {
          const str = child.stdout.replace(new RegExp('/n', 'g'), '')
            .replace(new RegExp('L', 'g'), '')
            .replace(new RegExp('\'', 'g'), '"')
          const result = JSON.parse(str)
          if (isIDE) {
            await mongo.findOneAndUpdate('processResult', {
              filter: {
                _id: value._id
              },
              update: {
                $set: {
                  timeUsed: result.timeused,
                  memoryUsed: result.memoryused,
                  status: 'Compile'
                }
              }
            })
            deleteFile(inputFile)
              .catch(e => e)
            deleteFile(outputFile)
              .catch(e => e)
          } else {
            const output = fs.readFileSync(path.join(__dirname, '../public/' + outputFile))
              .toString()
            if (output !== runnerResult.output) {
              if (output.replace(/[\r\n]/g, '')
                .replace(/\ +/g, '') !== runnerResult.output.replace(/[\r\n]/g, '')
                .replace(/\ +/g, '')) {
                await mongo.findOneAndUpdate('processResult', {
                  filter: {
                    _id: value._id
                  },
                  update: {
                    $set: {
                      timeUsed: result.timeused,
                      memoryUsed: result.memoryused,
                      status: 'Wrong Answer'
                    }
                  }
                })
              } else {
                if (result.timeused > timeLimit) {
                  await mongo.findOneAndUpdate('processResult', {
                    filter: {
                      _id: value._id
                    },
                    update: {
                      $set: {
                        timeUsed: timeLimit,
                        memoryUsed: result.memoryused,
                        status: 'Time Limit Exceeded'
                      }
                    }
                  })
                } else if (result.memoryused > memoryLimit) {
                  await mongo.findOneAndUpdate('processResult', {
                    filter: {
                      _id: value._id
                    },
                    update: {
                      $set: {
                        timeUsed: result.timeused,
                        memoryUsed: memoryLimit,
                        status: 'Memory Limit Exceeded'
                      }
                    }
                  })
                } else {
                  await mongo.findOneAndUpdate('processResult', {
                    filter: {
                      _id: value._id
                    },
                    update: {
                      $set: {
                        timeUsed: result.timeused,
                        memoryUsed: result.memoryused,
                        status: 'Presentation Error'
                      }
                    }
                  })
                }
              }
            } else {
              if (result.timeused > timeLimit) {
                await mongo.findOneAndUpdate('processResult', {
                  filter: {
                    _id: value._id
                  },
                  update: {
                    $set: {
                      timeUsed: timeLimit,
                      memoryUsed: result.memoryused,
                      status: 'Time Limit Exceeded'
                    }
                  }
                })
              } else if (result.memoryused > memoryLimit) {
                await mongo.findOneAndUpdate('processResult', {
                  filter: {
                    _id: value._id
                  },
                  update: {
                    $set: {
                      timeUsed: result.timeused,
                      memoryUsed: memoryLimit,
                      status: 'Memory Limit Exceeded'
                    }
                  }
                })
              } else {
                await mongo.findOneAndUpdate('processResult', {
                  filter: {
                    _id: value._id
                  },
                  update: {
                    $set: {
                      timeUsed: result.timeused,
                      memoryUsed: result.memoryused,
                      status: 'Accepted'
                    }
                  }
                })
              }
            }
          }
          await mongo.findOneAndUpdate('processStatus', {
            filter: {
              _id: pause._id
            },
            update: {
              $inc: { num: -1 }
            }
          })
          setTimeout(() => runner(), 500)
        }
      } catch (e) {
        console.error(e)
        await mongo.findOneAndUpdate('processStatus', {
          filter: {
            _id: pause._id
          },
          update: {
            $inc: { num: -1 }
          }
        })
        setTimeout(() => runner(), 500)
      }
    }
  }

  async getRunnerStatus() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    const { userId } = ctx
    const user = await mongo.findOne('user', {
      query: {
        isAdmin: true,
        _id: ObjectID(userId)
      }
    })
    if (!user) {
      return ctx.body = {
        code: 0,
        msg: '您无权进行操作'
      }
    }
    const { status } = await mongo.findOne('processStatus', {})
    ctx.body = {
      code: 1,
      msg: 'success',
      data: {
        status
      }
    }
  }
}

module.exports = roundController
