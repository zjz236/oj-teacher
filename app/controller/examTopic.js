'use strict'

const Controller = require('egg').Controller
const ObjectID = require('mongodb').ObjectID
const fs = require('fs')
const path = require('path')

class ExamTopicController extends Controller {
  async getExamTopicNum() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { examId } = ctx.request.query
      const tfTopic = await mongo.countDocuments('examTFTopic', {
        query: {
          examId: ObjectID(examId)
        }
      })
      const selectTopic = await mongo.countDocuments('examSelectTopic', {
        query: {
          examId: ObjectID(examId)
        }
      })
      const gapTopic = await mongo.countDocuments('examGapTopic', {
        query: {
          examId: ObjectID(examId)
        }
      })
      const programTopic = await mongo.countDocuments('examProgramTopic', {
        query: {
          examId: ObjectID(examId)
        }
      })
      ctx.body = {
        code: 1,
        msg: 'success',
        data: {
          selectTopic,
          tfTopic,
          gapTopic,
          programTopic
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

  async getExamTransferTopic() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { examId, common, topicType } = ctx.request.query
      const { userId } = ctx
      let examTopicType = ''
      switch (topicType) {
        case 'tfTopic':
          examTopicType = 'examTFTopic'
          break
        case 'selectTopic':
          examTopicType = 'examSelectTopic'
          break
        case 'gapTopic':
          examTopicType = 'examGapTopic'
          break
        default:
          examTopicType = 'examProgramTopic'
          break
      }
      const topicList = await mongo.find(topicType, {
        query: {
          common: JSON.parse(common),
          userId: ObjectID(userId)
        },
        projection: {
          description: 1,
          title: 1
        }
      })
      const examTopicList = await mongo.find(examTopicType, {
        query: {
          common: JSON.parse(common),
          examId: ObjectID(examId)
        },
        projection: {
          description: 1,
          title: 1,
          topicId: 1
        }
      })
      ctx.body = {
        code: 1,
        msg: 'success',
        data: {
          topicList,
          examTopicList
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

  async examTopicTransfer() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { examId, topicIdList, topicType } = ctx.request.body
      let examTopicType = ''
      switch (topicType) {
        case 'tfTopic':
          examTopicType = 'examTFTopic'
          break
        case 'selectTopic':
          examTopicType = 'examSelectTopic'
          break
        case 'gapTopic':
          examTopicType = 'examGapTopic'
          break
        default:
          examTopicType = 'examProgramTopic'
          break
      }
      const topicList = await mongo.find(topicType, {
        query: {
          _id: {
            $in: topicIdList.map(item => ObjectID(item))
          }
        }
      })
      const examTopicList = await mongo.find(examTopicType, {
        query: {
          examId: ObjectID(examId)
        }
      })
      for (const item of examTopicList) {
        const index = topicList.map(it => it._id.toString())
          .indexOf(item.topicId.toString())
        if (index < 0) {
          const topic = {
            tfTopic: 'tf',
            selectTopic: 'select',
            gapTopic: 'gap',
            programTopic: 'program'
          }
          const { deleteExamTopic } = ctx.helper.deleteUtil
          deleteExamTopic({ topicId: item._id, topicType: topic[topicType] })
        } else {
          topicList.splice(index, 1)
        }
      }
      for (const item of topicList) {
        const { insertedId } = await mongo.insertOne(examTopicType, {
          doc: Object.assign({ ...item }, { _id: undefined, topicId: ObjectID(item._id), examId: ObjectID(examId) })
        })
        if (topicType === 'gapTopic' || topicType === 'programTopic') {
          const topicTest = topicType === 'gapTopic' ? 'gapTestData' : 'programTestData'
          const examTopicTest = topicType === 'gapTopic' ? 'examGapTestData' : 'examProgramTestData'
          const testData = await mongo.find(topicTest, {
            query: Object.assign({}, topicType === 'gapTopic' ? { gapId: ObjectID(item._id) } : { programId: ObjectID(item._id) })
          })
          for (const data of testData) {
            topicType === 'gapTopic' ? (data.gapId = ObjectID(insertedId)) : (data.programId = ObjectID(insertedId))
            if (data.inputFile) {
              new Promise(resolve => {
                const inputFile = data.inputFile
                try {
                  const readerStream = fs.createReadStream(path.join(__dirname, '../public/' + inputFile))
                  const writerStream = fs.createWriteStream(path.join(__dirname, '../public/examTestData/' + inputFile))
                  readerStream.pipe(writerStream)
                } catch (e) {
                  e
                } finally {
                  resolve(true)
                }
              })
              data.inputFile = 'examTestData/' + data.inputFile
            }
            if (data.outputFile) {
              new Promise(resolve => {
                const outputFile = data.outputFile
                try {
                  const readerStream = fs.createReadStream(path.join(__dirname, '../public/' + outputFile))
                  const writerStream = fs.createWriteStream(path.join(__dirname, '../public/examTestData/' + outputFile))
                  readerStream.pipe(writerStream)
                } catch (e) {
                  e
                } finally {
                  resolve(true)
                }
              })
              data.outputFile = 'examTestData/' + data.outputFile
            }
          }
          testData.length && await mongo.insertMany(examTopicTest, {
            docs: testData
          })
        }
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
    }
  }

  async getExamTopicList() {
    const { ctx, app } = this
    try {
      const { examId, topicType, pageNo, pageSize, filters } = ctx.request.query
      const mongo = app.mongo.get('oj')
      const filter = filters.split(',')
        .map(item => parseInt(item))
      const total = await mongo.countDocuments(topicType, {
        query: Object.assign({ examId: ObjectID(examId) }, filters ? {
          section: {
            $in: filter
          }
        } : {})
      })
      const result = await mongo.find(topicType, {
        query: Object.assign({ examId: ObjectID(examId) }, filters ? {
          section: {
            $in: filter
          }
        } : {}),
        limit: parseInt(pageSize),
        skip: (parseInt(pageNo) - 1) * parseInt(pageSize)
      })
      ctx.body = {
        code: 1,
        data: {
          list: result,
          total
        },
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

  async getExamTopicInfo() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { topicType, topicId } = ctx.request.query
      const result = await mongo.findOne(topicType, {
        query: {
          _id: ObjectID(topicId)
        }
      })
      if (!result) {
        ctx.body = {
          code: 0,
          msg: '题目不存在'
        }
      } else {
        ctx.body = {
          code: 1,
          data: result,
          msg: 'success'
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

  async modifyExamTopic() {
    const { ctx, app } = this
    try {
      const { topicId, topicType } = ctx.request.body
      const mongo = app.mongo.get('oj')
      const modifyDoc = {}
      if (topicType === 'examTFTopic') {
        const { description, answer, section, difficulty, notes } = ctx.request.body
        Object.assign(modifyDoc, { description, answer, section, difficulty, notes })
      } else if (topicType === 'examSelectTopic') {
        const { description, options, answer, section, difficulty, notes } = ctx.request.body
        Object.assign(modifyDoc, { description, options, answer, section, difficulty, notes })
      } else if (topicType === 'examGapTopic') {
        const { description, code, gaps, section, difficulty, notes } = ctx.request.body
        Object.assign(modifyDoc, { description, code, gaps, section, difficulty, notes })
      } else if (topicType === 'examProgramTopic') {
        const { title, description, inputDesc, outputDesc, simpleInput, simpleOutput, timeLimit, memoryLimit, section, difficulty, notes } = ctx.request.body
        Object.assign(modifyDoc, {
          title,
          description,
          inputDesc,
          outputDesc,
          simpleInput,
          simpleOutput,
          timeLimit,
          memoryLimit,
          section,
          difficulty,
          notes
        })
      }
      const result = await mongo.findOneAndUpdate(topicType, {
        filter: {
          _id: ObjectID(topicId)
        },
        update: {
          $set: modifyDoc
        }
      })
      if (result.lastErrorObject.updatedExisting) {
        ctx.body = {
          code: 1,
          msg: '修改成功'
        }
      } else {
        ctx.body = {
          code: 0,
          msg: '修改失败'
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

  async deleteExamTopic() {
    const { ctx } = this
    try {
      const { topicId, topicType } = ctx.request.query
      const topic = {
        examTFTopic: 'tf',
        examSelectTopic: 'select',
        examGapTopic: 'gap',
        examProgramTopic: 'program'
      }
      const { deleteExamTopic } = ctx.helper.deleteUtil
      const result = await deleteExamTopic({ topicId, topicType: topic[topicType] })
      if (result) {
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

  async getAllExamTopic() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { examId } = ctx.request.query
      const tfTopic = await mongo.find('examTFTopic', {
        query: {
          examId: ObjectID(examId)
        }
      })
      const selectTopic = await mongo.find('examSelectTopic', {
        query: {
          examId: ObjectID(examId)
        }
      })
      const gapTopic = await mongo.aggregate('examGapTopic', {
        pipeline: [
          {
            $lookup: {
              from: 'examGapTestData',
              localField: '_id',
              foreignField: 'gapId',
              as: 'testData'
            }
          },
          {
            $match: {
              examId: ObjectID(examId)
            }
          }
        ]
      })
      const programTopic = await mongo.aggregate('examProgramTopic', {
        pipeline: [
          {
            $lookup: {
              from: 'examProgramTestData',
              localField: '_id',
              foreignField: 'programId',
              as: 'testData'
            }
          },
          {
            $match: {
              examId: ObjectID(examId)
            }
          }
        ]
      })
      ctx.body = {
        code: 1,
        msg: 'success',
        data: {
          tfTopic,
          selectTopic,
          gapTopic,
          programTopic
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

module.exports = ExamTopicController
