'use strict'
const fs = require('fs')
const shell = require('shelljs')
const path = require('path')
const { VM } = require('vm2')
const { getRandomNumber } = require('./app/util/languageCommon')

const deleteFile = fileName => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path.join(__dirname, './app/public/' + fileName))) {
      reject(new Error('文件不存在'))
      return
    }
    try {
      fs.unlinkSync(path.join(__dirname, './app/public/' + fileName))
      resolve(true)
    } catch (err) {
      reject(new Error(err))
    }
  })
}

module.exports = app => {
  // 开始前执行
  app.beforeStart(async () => {

  })
  // 准备好执行
  app.ready(async () => {
    const mongo = app.mongo.get('oj')
    setTimeout(() => runner(), 0)
    setTimeout(() => runner(), 10)
    setTimeout(() => runner(), 20)
    setTimeout(() => runner(), 30)

    async function runner() {
      const pause = await mongo.findOne('processStatus', {})
      let resultId = ''
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
        resultId = value._id
        const { code, inputFile, outputFile, language, isIDE, timeLimit, memoryLimit } = value
        const fileName = getRandomNumber()
        let filePath
        if (language === 'c') {
          filePath = path.join(__dirname, './app/public/code/c/')
          fs.writeFileSync(filePath + fileName + '.c', code)
          const res = shell.exec(`gcc ${fileName + '.c'} -o ${fileName + '.o'}`, {
            async: false,
            cwd: filePath,
            silent: true
          })
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
          filePath = path.join(__dirname, './app/public/code/cpp/')
          fs.writeFileSync(filePath + fileName + '.cpp', code)
          const res = shell.exec(`g++ ${fileName + '.cpp'} -o ${fileName + '.o'}`, {
            async: false, cwd: filePath,
            silent: true
          })
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
          filePath = path.join(__dirname, './app/public/code/java/' + fileName + '/')
          fs.mkdirSync(filePath)
          fs.writeFileSync(filePath + 'Main.java', code)
          const res = shell.exec(`javac ${'Main.java'}`, {
            async: false, cwd: filePath,
            silent: true
          })
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
          filePath = path.join(__dirname, './app/public/code/python/')
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
        const vm = new VM({
          require: {
            external: true
          },
          sandbox: {
            shell,
            runShell,
            fs,
            inputFile,
            path,
            filePath,
            __dirname
          }
        })
        const runnerResult = await vm.run(`new Promise(resolve => {
          const child = shell.exec(runShell, {
            async: true,
            timeout: 10000,
            cwd: filePath,
            silent: true
          })
          child.on('error', err => {
            resolve({
              code: 1,
              err
            })
          })
          const inputData = inputFile ? fs.readFileSync(path.join(__dirname, './app/public/' + inputFile)) : ''
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
        })`)
        // const runnerResult = await new Promise(resolve => {
        //   const child = shell.exec(runShell, {
        //     // silent: true,
        //     async: true,
        //     timeout: 10000,
        //     cwd: filePath,
        //     silent: true
        //   })
        //   child.on('error', err => {
        //     resolve({
        //       code: 1,
        //       err
        //     })
        //   })
        //   const inputData = inputFile ? fs.readFileSync(path.join(__dirname, './app/public/' + inputFile)) : ''
        //   child.stdin.write(inputData)
        //   child.stdin.end()
        //   let outputResult = ''
        //   child.stdout.on('data', data => {
        //     outputResult += data
        //   })
        //   child.on('close', () => {
        //     resolve({
        //       code: 0,
        //       output: outputResult
        //     })
        //   })
        // })
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
        fs.writeFileSync(path.join(__dirname, './app/public/outputData/' + fileName + '.out'), runnerResult.output)
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
        const child = shell.exec(`python ${path.join(__dirname, './app/source/test.py')} ${testShell} ${inputFile} outputData/${fileName}.out`, {
          silent: true,
          timeout: 10000
        })
        fs.unlinkSync(path.join(__dirname, './app/public/outputData/' + fileName + '.out'))
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
            fs.rmdirSync(path.join(__dirname, './app/public/code/java/' + fileName))
            break
          default:
            fs.unlinkSync(filePath + fileName + '.py')
            break
        }
        if (process.env.NODE_ENV === 'development') {
          child.stdout = '{\'memoryused\': 10916L, \'timeused\': 1000L, \'result\': 0L}\n'
        }
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
            const output = fs.readFileSync(path.join(__dirname, './app/public/' + outputFile))
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
        await mongo.findOneAndUpdate('processResult', {
          filter: {
            _id: resultId
          },
          update: {
            $set: {
              status: 'Service Error',
              e
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
        setTimeout(() => runner(), 500)
      }
    }
  })
  // 关闭前执行
  app.beforeClose(async () => {

  })
}
