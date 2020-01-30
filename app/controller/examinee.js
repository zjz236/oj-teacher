'use strict'

const Controller = require('egg').Controller
const ObjectID = require('mongodb').ObjectID

class examineeController extends Controller {
  async examineeAdd() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    try {
      let { classList, studentList, examId } = ctx.request.body
      examId = ObjectID(examId)
      classList = classList.map(classes => ObjectID(classes))
      for (const item of studentList) {
        item.classId = item.classId ? ObjectID(item.classId) : ''
        item.examId = examId
      }
      await mongo.deleteMany('examClasses', {
        filter: {
          examId
        }
      })
      await mongo.deleteMany('examinee', {
        filter: {
          examId
        }
      })
      const classes = []
      for (const item of classList) {
        classes.push({
          examId,
          classId: item
        })
      }
      const insertClass = await mongo.insertMany('examClasses', {
        docs: classes
      })
      const insertExaminee = await mongo.insertMany('examinee', {
        docs: studentList
      })
      if (insertClass.result.ok && insertExaminee.result.ok) {
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
        msg: '系统异常'
      }
    }
  }

  async examineeModify() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { school, college, major, className, username, password, name, sex, studentId, notes, examId, isAdd, examineeId } = ctx.request.body
      if (isAdd) {
        const res = await mongo.findOne('examinee', {
          query: {
            username
          }
        })
        if (res) {
          return ctx.body = {
            code: 0,
            msg: '用户名已存在'
          }
        }
        const result = await mongo.insertOne('examinee', {
          doc: {
            school,
            college,
            major,
            className,
            username,
            password,
            name,
            sex,
            studentId,
            notes,
            examId: ObjectID(examId),
            classId: '',
            tfScore: 0,
            selectScore: 0,
            gapScore: 0,
            programScore: 0,
            score: 0,
            isLogin: false
          }
        })
        if (!result.result) {
          return ctx.body = {
            code: 0,
            msg: '添加失败'
          }
        }
        ctx.body = {
          code: 1,
          msg: '添加成功'
        }
      } else {
        const res = await mongo.findOne('examinee', {
          query: {
            username,
            _id: {
              $ne: ObjectID(examineeId)
            }
          }
        })
        if (res) {
          return ctx.body = {
            code: 0,
            msg: '用户名已存在'
          }
        }
        const result = await mongo.findOneAndUpdate('examinee', {
          filter: {
            _id: ObjectID(examineeId)
          },
          update: {
            $set: {
              school,
              college,
              major,
              className,
              username,
              password,
              name,
              sex,
              studentId,
              notes
            }
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

  async getExamineeList() {
    const { ctx, app } = this
    try {
      const { examId, search, pageNo, pageSize, sortedName, sortedType } = ctx.request.query
      const mongo = app.mongo.get('oj')
      const reg = new RegExp(search)
      let sort = {}
      switch (sortedName) {
        case 'studentId':
          sort = { studentId: sortedType === 'ascending' ? 1 : -1 }
          break
        case 'score':
          sort = { score: sortedType === 'ascending' ? 1 : -1 }
          break
        default:
          sort = {}
          break
      }
      const total = await mongo.countDocuments('examinee', {
        query: {
          examId: ObjectID(examId),
          name: {
            $regex: reg
          }
        }
      })
      const result = await mongo.find('examinee', {
        query: {
          examId: ObjectID(examId),
          name: {
            $regex: reg
          }
        },
        limit: parseInt(pageSize),
        skip: parseInt(pageNo - 1),
        sort
      })
      ctx.body = {
        code: 1,
        data: {
          total,
          list: result
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

  async getExamineeInfo() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { examId, examineeId } = ctx.request.query
      const result = await mongo.findOne('examinee', {
        query: {
          _id: ObjectID(examineeId),
          examId: ObjectID(examId)
        }
      })
      if (!result) {
        return ctx.body = {
          code: 0,
          msg: '未找到该考生'
        }
      }
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

  async getExamineeAddInfo() {
    const { ctx, app } = this
    const mongo = app.mongo.get('oj')
    try {
      let { examId } = ctx.request.query
      examId = ObjectID(examId)
      let classes = await mongo.find('examClasses', {
        query: {
          examId
        },
        projection: {
          _id: 0, classId: 1
        }
      })
      classes = classes.map(item => item.classId)
      const examinee = await mongo.find('examinee', {
        query: {
          examId
        },
        projection: {
          _id: 0
        }
      })
      ctx.body = {
        code: 1,
        msg: 'success',
        data: {
          examinee,
          classes
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

  async deleteExaminee() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { examineeId } = ctx.request.query
      const result = await mongo.findOneAndDelete('examinee', {
        filter: {
          _id: ObjectID(examineeId)
        }
      })
      if (result.lastErrorObject.n) {
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

module.exports = examineeController
