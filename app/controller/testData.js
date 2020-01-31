'use strict'

const Controller = require('egg').Controller
const fs = require('fs')
const ObjectID = require('mongodb').ObjectID

class TestDataController extends Controller {
  async gapTest() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    try {
      const { codeRunner } = ctx.helper.util
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
          input.data = fs.readFileSync(file.filepath)
        } else if (file.fieldname === 'outputFile') {
          output.exit = true
          output.data = fs.readFileSync(file.filepath)
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
      const { getFile } = ctx.helper.ossUtil
      if (!output.exit && exitResult.outputFile) {
        const data = await getFile(exitResult.outputFile)
        output.data = data.toString()
      }
      if (!input.exit && exitResult.inputFile) {
        const data = await getFile(exitResult.inputFile)
        input.data = data.toString()
      }
      const result = await mongo.insertOne('processResult', {
        doc: {
          status: 0,
          result: '',
          timeLimit: '',
          output: '',
          memoryLimit: '',
          err: ''
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
      const res = await codeRunner({ code, language, inputData: input.data, outputData: output.data })
      if (res.code === 1) {
        await mongo.findOneAndUpdate('processResult', {
          filter: {
            _id: result.insertedId
          },
          update: {
            $set: {
              result: res.result,
              output: res.outputData,
              memoryLimit: res.memoryLimit,
              timeLimit: res.timeLimit,
              status: 1
            }
          }
        })
      } else {
        await mongo.findOneAndUpdate('processResult', {
          filter: {
            _id: result.insertedId
          },
          update: {
            $set: {
              status: 1,
              result: 0,
              err: res.err
            }
          }
        })
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
      const { id } = ctx.request.query
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
      const { gapId, status, errMsg } = ctx.request.body
      let inputFile = null,
        outputFile = null
      const { putFile, deleteFile } = ctx.helper.ossUtil
      for (const file of files) {
        if (file.fieldname === 'inputFile') {
          inputFile = await putFile(`inputData/${fileName}.in`, file.filepath, { headers: { 'Content-Disposition': 'attachment' } })
        } else if (file.fieldname === 'outputFile') {
          outputFile = await putFile(`outputData/${fileName}.out`, file.filepath, { headers: { 'Content-Disposition': 'attachment' } })
        }
      }
      const { value: updataValue } = await mongo.findOneAndUpdate('gapTestData', {
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
        const { insertedCount } = await mongo.insertOne('gapTestData', {
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
        deleteFile(updataValue.inputFile)
          .catch(e => e)
        deleteFile(updataValue.outputFile)
          .catch(e => e)
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
      const { gapId } = ctx.request.query
      const result = await mongo.findOne('gapTestData', {
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
      const { gapId } = ctx.request.query
      const { value: deleteValue } = await mongo.findOneAndDelete('gapTestData', {
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
}

module.exports = TestDataController
