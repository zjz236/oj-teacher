'use strict'

const Controller = require('egg').Controller
const ObjectID = require('mongodb').ObjectID

class ClassesController extends Controller {
  async addClasses() {
    const { ctx, app } = this
    const { students, add, school, college, major, className, classId } = ctx.request.body
    const { userId } = ctx
    const { readUsername } = ctx.helper.util
    if (readUsername(students)) {
      return ctx.body = {
        code: 0,
        msg: `用户名'${readUsername(students)}'重复输入！`
      }
    }
    const mongo = app.mongo.get('oj')
    if (add) {
      try {
        const result = await mongo.insertOne('classes', {
          doc: {
            school,
            college,
            major,
            className,
            userId
          }
        })
        if (result.insertedId) {
          students.forEach(item => {
            item.classId = result.insertedId
          })
          const res = await mongo.insertMany('classesStudent', {
            docs: students
          })
          if (res.result.ok) {
            return ctx.body = {
              code: 1,
              msg: '添加成功'
            }
          }
          return ctx.body = {
            code: 0,
            msg: '添加失败，请重新添加！'
          }
        }
        return ctx.body = {
          code: 0,
          msg: '添加失败，请重新添加！'
        }
      } catch (e) {
        console.error(e)
        return ctx.body = {
          code: 0,
          msg: '系统异常，请重新添加！'
        }
      }
    } else {
      try {
        const result = await mongo.findOneAndUpdate('classes', {
          filter: {
            _id: ObjectID(classId),
            userId
          },
          update: {
            $set: {
              school,
              college,
              major,
              className
            }
          }
        })
        if (result.value) {
          const { deleteClassesStudent } = ctx.helper.deleteUtil
          await deleteClassesStudent({ classId })
          students.forEach(item => {
            item.classId = ObjectID(classId)
          })
          const res = await mongo.insertMany('classesStudent', {
            docs: students
          })
          if (res) {
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
  }

  async getClassList() {
    const { ctx, app } = this
    const { pageNo, pageSize } = ctx.request.query
    const search = ctx.request.query.search || ''
    const mongo = app.mongo.get('oj')
    const { userId } = ctx
    try {
      const reg = new RegExp(search)
      const total = await mongo.countDocuments('classes', {
        query: {
          userId,
          className: {
            $regex: reg
          }
        }
      })
      const result = await mongo.find('classes', {
        query: {
          userId,
          className: {
            $regex: reg
          }
        },
        limit: parseInt(pageSize),
        skip: (parseInt(pageNo) - 1) * parseInt(pageSize)
      })
      for (const item of result) {
        item.studentNum = await mongo.countDocuments('classesStudent', {
          query: {
            classId: item._id
          }
        })
      }
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

  async getClassInfo() {
    const { ctx, app } = this
    const { classId } = ctx.request.query
    const mongo = app.mongo.get('oj')
    const { userId } = ctx
    try {
      const result = await mongo.findOne('classes', {
        query: {
          _id: ObjectID(classId),
          userId
        }
      })
      if (result) {
        const res = await mongo.find('classesStudent', {
          query: {
            classId: result._id
          },
          projection: {
            _id: 0, classId: 0
          },
          sort: {
            _id: 1
          }
        })
        result.student = res || []
      }
      ctx.body = {
        msg: 'success',
        code: 1,
        data: result
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        msg: '系统异常',
        code: 0
      }
    }

  }

  async deleteClass() {
    const { ctx } = this
    const { userId } = ctx
    const { classId } = ctx.request.query
    try {
      const { deleteClasses } = ctx.helper.deleteUtil
      const result = await deleteClasses({ classId, userId })
      if (result) {
        ctx.body = {
          msg: '删除成功',
          code: 1
        }
      } else {
        ctx.body = {
          msg: '删除失败',
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

  async getClassesStudent() {
    const { ctx, app } = this
    let { classId } = ctx.request.query
    const mongo = app.mongo.get('oj')
    try {
      classId = classId.split(',')
        .map(item => ObjectID(item))
      const result = await mongo.find('classesStudent', {
        query: {
          classId: {
            $in: classId
          }
        },
        projection: {
          _id: 0
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
}

module.exports = ClassesController
