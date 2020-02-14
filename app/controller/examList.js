'use strict'

const Controller = require('egg').Controller
const ObjectID = require('mongodb').ObjectID

class examListController extends Controller {
  async addExam() {
    const { ctx, app } = this
    const { userId } = ctx
    const mongo = app.mongo.get('oj')
    try {
      const { examName, isShow, startTime, finishTime, language, isExam, isSort, note } = ctx.request.body
      const result = await mongo.insertOne('examList', {
        doc: {
          userId,
          examName,
          isShow,
          startTime: new Date(startTime),
          finishTime: new Date(finishTime),
          language,
          isExam,
          isSort,
          note,
          tfStatus: 0,
          selectStatus: 0,
          gapStatus: 0,
          programStatus: 0,
          createTime: new Date()
        }
      })
      if (result.insertedCount) {
        ctx.body = {
          code: 1,
          msg: '添加成功'
        }
      } else {
        ctx.body = {
          code: 0,
          msg: '添加失败'
        }
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '服务器错误'
      }
    }
  }

  async getExamList() {
    const { ctx, app } = this
    const { userId } = ctx
    const { pageNo, pageSize } = ctx.request.query
    const search = ctx.request.query.search || ''
    const mongo = app.mongo.get('oj')
    try {
      const reg = new RegExp(search)
      const total = await mongo.countDocuments('examList', {
        query: {
          userId,
          examName: {
            $regex: reg
          }
        }
      })
      const result = await mongo.find('examList', {
        query: {
          userId,
          examName: {
            $regex: reg
          }
        },
        projection: {
          userId: 0,
          tfStatus: 0,
          selectStatus: 0,
          gapStatus: 0,
          programStatus: 0,
          createTime: 0
        },
        limit: parseInt(pageSize),
        skip: parseInt(pageNo - 1)
      })
      ctx.body = {
        code: 1,
        msg: 'success',
        data: {
          list: result,
          total
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

  async getExamInfo() {
    const { ctx, app } = this
    const { examId } = ctx.request.query
    const { userId } = ctx
    const mongo = app.mongo.get('oj')
    try {
      const result = await mongo.findOne('examList', {
        query: {
          _id: ObjectID(examId),
          userId
        },
        options: {
          projection: {
            userId: 0,
            createTime: 0
          }
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

  async examEdit() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    const { examName, isShow, startTime, finishTime, language, isExam, isSort, note, examId } = ctx.request.body
    const { userId } = ctx
    try {
      const result = await mongo.findOneAndUpdate('examList', {
        filter: {
          userId,
          _id: ObjectID(examId)
        },
        update: {
          $set: {
            examName,
            isShow,
            startTime: new Date(startTime),
            finishTime: new Date(finishTime),
            language,
            isExam,
            isSort,
            note
          }
        }
      })
      if (result.lastErrorObject.updatedExisting) {
        ctx.body = {
          msg: '修改成功',
          code: 1
        }
      } else {
        ctx.body = {
          msg: '修改失败',
          code: 0
        }
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        msg: '系统异常',
        code: 0
      }
    }
  }

  async examAnalysis() {
    const { ctx, app } = this
    try {
      const { examId } = ctx.request.query
      const mongo = app.mongo.get('oj')
      const examInfo = await mongo.findOne('examList', {
        query: {
          _id: ObjectID(examId)
        }
      })
      const examinee = await mongo.find('examinee', {
        query: {
          examId: ObjectID(examId)
        }
      })
      const examTFTopic = await mongo.aggregate('examTFTopic', {
        pipeline: [
          {
            $match: { examId: ObjectID(examId) }
          },
          {
            $lookup: {
              from: 'examTFAnswer',
              localField: '_id',
              foreignField: 'topicId',
              as: 'answer'
            }
          }
        ]
      })
      const examSelectTopic = await mongo.aggregate('examSelectTopic', {
        pipeline: [
          {
            $match: { examId: ObjectID(examId) }
          },
          {
            $lookup: {
              from: 'examSelectAnswer',
              localField: '_id',
              foreignField: 'topicId',
              as: 'answer'
            }
          }
        ]
      })
      const examGapTopic = await mongo.aggregate('examGapTopic', {
        pipeline: [
          {
            $match: { examId: ObjectID(examId) }
          },
          {
            $lookup: {
              from: 'examGapAnswer',
              localField: '_id',
              foreignField: 'topicId',
              as: 'answer'
            }
          }
        ]
      })
      const examProgramTopic = await mongo.aggregate('examProgramTopic', {
        pipeline: [
          {
            $match: { examId: ObjectID(examId) }
          },
          {
            $lookup: {
              from: 'examProgramAnswer',
              localField: '_id',
              foreignField: 'topicId',
              as: 'answer'
            }
          }
        ]
      })
      ctx.body = {
        code: 1,
        msg: 'success',
        data: {
          examInfo,
          examinee,
          examTFTopic,
          examSelectTopic,
          examGapTopic,
          examProgramTopic
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

module.exports = examListController
