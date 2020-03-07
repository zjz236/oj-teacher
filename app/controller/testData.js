'use strict'

const Controller = require('egg').Controller
const ObjectID = require('mongodb').ObjectID

class TestDataController extends Controller {
  async gapTest() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    try {
      const files = ctx.request.files
      const { code, language, gapId, gapType } = ctx.request.body
      const input = {
        exit: false,
        data: ''
      }
      const output = {
        exit: false,
        data: ''
      }
      files.forEach(file => {
        if (file.fieldname === 'inputFile') {
          input.exit = true
          input.data = file
        } else if (file.fieldname === 'outputFile') {
          output.exit = true
          output.data = file
        }
      })
      const exitResult = await mongo.findOne(gapType, {
        query: {
          gapId: ObjectID(gapId)
        }
      })
      if (!exitResult && !output.exit) {
        return ctx.body = {
          code: 0,
          msg: '请添加输出文件'
        }
      }
      const { getRandomNumber } = ctx.helper.util
      const fileName = getRandomNumber()
      const { putFile } = ctx.helper.ossUtil
      let inputFile = ''
      let outputFile = ''
      if (output.exit) {
        const { name } = await putFile('outputData/' + fileName + '.out', output.data.filepath)
        outputFile = name
      } else if (exitResult.outputFile) {
        outputFile = exitResult.outputFile
      }
      if (input.exit) {
        const { name } = await putFile('inputData/' + fileName + '.in', input.data.filepath)
        inputFile = name
      } else if (exitResult.inputFile) {
        inputFile = exitResult.inputFile
      }
      const result = await mongo.insertOne('processResult', {
        doc: {
          status: 'Queuing',
          timeLimit: 10000,
          inputFile,
          outputFile,
          code,
          isIDE: false,
          memoryLimit: 100000,
          errMsg: '',
          language
        }
      })
      if (!result.insertedId) {
        ctx.cleanupRequestFiles()
        return ctx.body = {
          code: 0,
          msg: '检测失败'
        }
      }
      ctx.body = {
        code: 1,
        msg: 'success',
        data: {
          id: result.insertedId
        }
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    } finally {
      ctx.cleanupRequestFiles()
    }

  }

  async gapTestStatus() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    try {
      const { id, gapId, gapType } = ctx.request.query
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
        if ([ 'Queuing', 'Running' ].indexOf(result.status) < 0) {
          const unlink = await mongo.findOne(gapType, {
            query: {
              gapId: ObjectID(gapId)
            }
          })
          const { deleteFile } = ctx.helper.ossUtil
          if (unlink) {
            if (unlink.outputFile !== result.outputFile) {
              deleteFile(result.outputFile)
            }
            if (unlink.inputFile !== result.inputFile) {
              deleteFile(result.inputFile)
            }
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

  async gapTestSubmit() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    try {
      const { getRandomNumber } = ctx.helper.util
      const fileName = getRandomNumber()
      const files = ctx.request.files
      const { gapId, status, errMsg, topicType } = ctx.request.body
      let inputFile = null,
        outputFile = null
      const { putFile, deleteFile } = ctx.helper.ossUtil
      for (const file of files) {
        if (file.fieldname === 'inputFile') {
          inputFile = await putFile(`${topicType === 'examGapTestData' ? 'examTestData/' : ''}inputData/${fileName}.in`, file.filepath, { headers: { 'Content-Disposition': 'attachment' } })
        } else if (file.fieldname === 'outputFile') {
          outputFile = await putFile(`${topicType === 'examGapTestData' ? 'examTestData/' : ''}outputData/${fileName}.out`, file.filepath, { headers: { 'Content-Disposition': 'attachment' } })
        }
      }
      const { value: updataValue } = await mongo.findOneAndUpdate(topicType, {
        filter: {
          gapId: ObjectID(gapId)
        },
        update: {
          $set:
            Object.assign({}, {
              status, errMsg
            }, inputFile === null ? {} : { inputFile: inputFile.name }, outputFile === null ? {} : { outputFile: outputFile.name })
        }
      })
      if (updataValue === null) {
        if (outputFile === null) {
          ctx.cleanupRequestFiles()
          return ctx.body = {
            code: 0,
            msg: '请上传输出文件'
          }
        }
        const { insertedCount } = await mongo.insertOne(topicType, {
          doc: Object.assign({}, {
            status, errMsg, outputFile: outputFile.name, gapId: ObjectID(gapId)
          }, inputFile === null ? { inputFile: null } : { inputFile: inputFile.name })
        })
        if (insertedCount) {
          ctx.body = {
            code: 1,
            msg: '测试数据提交成功'
          }
        } else {
          ctx.body = {
            code: 0,
            msg: '测试数据提交失败'
          }
        }
      } else {
        if (inputFile !== null) {
          deleteFile(updataValue.inputFile)
            .catch(e => e)
        }
        if (outputFile !== null) {
          deleteFile(updataValue.outputFile)
            .catch(e => e)
        }
        ctx.body = {
          code: 1,
          msg: '测试数据提交成功'
        }
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    } finally {
      ctx.cleanupRequestFiles()
    }
  }

  async getGapTestInfo() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    try {
      const { gapId, topicType } = ctx.request.query
      const result = await mongo.findOne(topicType, {
        query: {
          gapId: ObjectID(gapId)
        }
      })
      ctx.body = {
        code: 1,
        msg: 'success',
        data: result
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }

  async deleteGapTest() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    try {
      const { gapId, topicType } = ctx.request.query
      const { value: deleteValue } = await mongo.findOneAndDelete(topicType, {
        filter: {
          gapId: ObjectID(gapId)
        }
      })
      const { deleteFile } = ctx.helper.ossUtil
      if (deleteValue) {
        deleteFile(deleteValue.inputFile)
          .catch(e => e)
        deleteFile(deleteValue.outputFile)
          .catch(e => e)
        ctx.body = {
          code: 1,
          msg: '删除成功'
        }
      } else {
        ctx.body = {
          code: 0,
          msg: '删除失败'
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

  async uploadProgramTest() {
    const { ctx, app } = this
    try {
      console.log(ctx)
      const file = ctx.request.files[0]
      const { programId, testId, programType } = ctx.request.body
      const { putFile } = ctx.helper.ossUtil
      const { getRandomNumber } = ctx.helper.util
      const filename = getRandomNumber()
      const result = await putFile(`${programType === 'examProgramTestData' ? 'examTestData/' : ''}${file.fieldname === 'inputFile' ? 'inputData' : 'outputData'}/${filename}.${file.fieldname === 'inputFile' ? 'in' : 'out'}`, file.filepath)
      const mongo = app.mongo.get('oj')
      const value = {}
      value[file.fieldname] = result.name
      const { value: updateValue } = await mongo.findOneAndUpdate(programType, {
        filter: {
          _id: testId ? ObjectID(testId) : ''
        },
        update: {
          $set: value
        }
      })
      if (!updateValue) {
        await mongo.insertOne(programType, {
          doc: Object.assign(value, { programId: ObjectID(programId) })
        })
      }
      ctx.body = {
        code: 1,
        msg: 'success'
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    } finally {
      ctx.cleanupRequestFiles()
    }

  }

  async getProgramTest() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { programId, programType } = ctx.request.query
      const result = await mongo.find(programType, {
        query: {
          programId: ObjectID(programId)
        },
        sort: {
          _id: 1
        }
      })
      ctx.body = {
        code: 1,
        data: result,
        msg: 'success'
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }

  async deleteProgramTest() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { testId, programType } = ctx.request.query
      const { value: deleteValue } = await mongo.findOneAndDelete(programType, {
        filter: {
          _id: ObjectID(testId)
        }
      })
      ctx.body = {
        code: 1,
        msg: 'success'
      }
      const { deleteFile } = ctx.helper.ossUtil
      deleteValue.inputFile && deleteFile(deleteValue.inputFile)
        .catch(e => e)
      deleteValue.outputFile && deleteFile(deleteValue.outputFile)
        .catch(e => e)
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }

  async programTest() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    try {
      const { code, programId, programType, language } = ctx.request.body
      const program = programType === 'programTestData' ? 'programTopic' : 'examProgramTopic'
      const value = await mongo.findOne(program, {
        query: {
          _id: ObjectID(programId)
        }
      })
      if (!value) {
        return ctx.body = {
          code: 0,
          msg: '系统异常'
        }
      }
      const result = await mongo.find(programType, {
        query: {
          programId: ObjectID(programId)
        }
      })
      if (!result.length) {
        return ctx.body = {
          code: 0,
          msg: '测试数据不能为空'
        }
      }
      ctx.body = {
        code: 1,
        msg: 'success'
      }
      for (const item of result) {
        const { insertedId } = await mongo.insertOne('processResult', {
          doc: {
            inputFile: item.inputFile,
            outputFile: item.outputFile,
            code,
            language,
            memoryLimit: value.memoryLimit,
            timeLimit: value.timeLimit,
            status: 'Queuing',
            isIDE: false
          }
        })
        ctx.body = {
          code: 1,
          msg: 'success'
        }
        await mongo.findOneAndUpdate(programType, {
          filter: {
            _id: ObjectID(item._id)
          },
          update: {
            $set: {
              status: 'Queuing'
            }
          }
        })
        item.insertedId = insertedId
      }
      try {
        const some = await new Promise((resolve, reject) => {
          const time = setInterval(async () => {
            try {
              const some = await mongo.find('processResult', {
                query: {
                  _id: {
                    $in: result.map(item => ObjectID(item.insertedId))
                  }
                }
              })
              if (some.map(item => item.status)
                .indexOf('Queuing') < 0 && some.map(item => item.status)
                .indexOf('Running') < 0) {
                resolve(some)
                clearInterval(time)
              }
            } catch (e) {
              reject(e)
            }
          }, 500)
        })
        result.forEach(res => {
          some.forEach(async so => {
            if (res.insertedId.toString() === so._id.toString()) {
              await mongo.findOneAndUpdate(programType, {
                filter: {
                  _id: ObjectID(res._id)
                },
                update: {
                  $set: {
                    status: so.status
                  }
                }
              })
            }
          })
        })
      } catch (e) {
        for (const item of result) {
          await mongo.findOneAndUpdate(programType, {
            filter: {
              _id: ObjectID(item._id)
            },
            update: {
              $set: {
                status: 'Running Error'
              }
            }
          })
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
}

module.exports = TestDataController
