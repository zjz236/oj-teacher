'use strict'

const Controller = require('egg').Controller
const ObjectID = require('mongodb').ObjectID

class TopicController extends Controller {
  async topicModify() {
    const { ctx, app } = this
    const { userId } = ctx
    try {
      const { topicId, topicType, editable } = ctx.request.body
      const mongo = app.mongo.get('oj')
      const modifyDoc = {}
      if (topicType === 'tfTopic') {
        const { description, answer, section, difficulty, notes, common } = ctx.request.body
        Object.assign(modifyDoc, { description, answer, section, difficulty, notes, common, userId })
      } else if (topicType === 'selectTopic') {
        const { description, options, answer, section, difficulty, notes, common } = ctx.request.body
        Object.assign(modifyDoc, { description, options, answer, section, difficulty, notes, common, userId })
      } else if (topicType === 'gapTopic') {
        const { description, code, gaps, section, difficulty, notes, common } = ctx.request.body
        Object.assign(modifyDoc, { description, code, gaps, section, difficulty, notes, common, userId })
      } else if (topicType === 'programTopic') {
        const { title, description, inputDesc, outputDesc, simpleInput, simpleOutput, timeLimit, memoryLimit, section, difficulty, notes, common } = ctx.request.body
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
          notes,
          common,
          userId
        })
      }
      if (!editable) {
        const result = await mongo.insertOne(topicType, {
          doc: modifyDoc
        })
        if (result.result.ok) {
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
      } else {
        const result = await mongo.findOneAndUpdate(topicType, {
          filter: {
            _id: ObjectID(topicId),
            userId
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
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }

  async getTopicList() {
    const { ctx, app } = this
    const { userId } = ctx
    try {
      const { common, topicType, pageNo, pageSize, filters } = ctx.request.query
      const mongo = app.mongo.get('oj')
      const filter = filters.split(',')
        .map(item => parseInt(item))
      const total = await mongo.countDocuments(topicType, {
        query: Object.assign({ common: JSON.parse(common) }, common ? {} : { userId }, filters ? {
          section: {
            $in: filter
          }
        } : {})
      })
      const result = await mongo.find(topicType, {
        query: Object.assign({ common: JSON.parse(common) }, common ? {} : { userId }, filters ? {
          section: {
            $in: filter
          }
        } : {}),
        limit: parseInt(pageSize),
        skip: parseInt(pageNo - 1)
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

  async getTopicInfo() {
    const { ctx, app } = this
    const { userId } = ctx
    try {
      const mongo = app.mongo.get('oj')
      const { topicId, topicType } = ctx.request.query
      const result = await mongo.findOne(topicType, {
        query: {
          _id: ObjectID(topicId),
          userId
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

  async deleteTopic() {
    const { ctx } = this
    try {
      const { topicId, topicType } = ctx.request.query
      const { userId } = ctx
      const topic = {
        tfTopic: 'tf',
        selectTopic: 'select',
        gapTopic: 'gap',
        programTopic: 'program'
      }
      const { deleteTopic } = ctx.helper.deleteUtil
      const result = await deleteTopic({ topicId, topicType: topic[topicType], userId })
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
}

module.exports = TopicController
