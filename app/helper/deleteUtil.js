'use strict'
const fs = require('fs')
const path = require('path')
const ObjectID = require('mongodb').ObjectID

module.exports = app => {
  const deleteClasses = ({ classId, userId }) => {
    return new Promise(async resolve => {
      const mongo = app.mongo.get('oj')
      const result = await mongo.find('classes', {
        query: Object.assign({}, classId ? { _id: ObjectID(classId) } : {}, userId ? { userId: ObjectID(userId) } : {})
      })
      await mongo.deleteMany('classes', {
        filter: Object.assign({}, classId ? { _id: ObjectID(classId) } : {}, userId ? { userId: ObjectID(userId) } : {})
      })
      for (const item of result) {
        deleteClassesStudent({ classId: item._id })
      }
      resolve(true)
    })
  }

  const deleteClassesStudent = ({ classId }) => {
    return new Promise(async resolve => {
      const mongo = app.mongo.get('oj')
      await mongo.deleteMany('classesStudent', {
        filter: {
          classId: ObjectID(classId)
        }
      })
      resolve(true)
    })
  }
  const deleteUser = ({ userId }) => {
    return new Promise(async resolve => {
      const mongo = app.mongo.get('oj')
      await mongo.deleteMany('user', {
        filter: {
          _id: ObjectID(userId)
        }
      })
      deleteExam({ userId })
      deleteClasses({ userId })
      deleteTopic({ userId, topicType: 'tf' })
      deleteTopic({ userId, topicType: 'select' })
      deleteTopic({ userId, topicType: 'gap' })
      deleteTopic({ userId, topicType: 'program' })
      resolve(true)
    })
  }
  const deleteTopic = ({ topicId, userId, topicType }) => {
    return new Promise(async resolve => {
      const mongo = app.mongo.get('oj')
      const topic = {
        tf: 'tfTopic',
        select: 'selectTopic',
        gap: 'gapTopic',
        program: 'programTopic'
      }
      const result = await mongo.find(topic[topicType], {
        query: Object.assign({}, userId ? { examId: ObjectID(userId) } : {}, topicId ? { _id: ObjectID(topicId) } : {})
      })
      await mongo.deleteMany(topic[topicType], {
        filter: Object.assign({}, userId ? { examId: ObjectID(userId) } : {}, topicId ? { _id: ObjectID(topicId) } : {})
      })
      for (const item of result) {
        deleteExamAnswer({ topicId: item._id, topicType })
      }
      if (topicType === 'gap' || topicType === 'program') {
        for (const item of result) {
          deleteTestData({ topicId: item._id, topicType })
        }
      }
      resolve(true)
    })
  }
  const deleteTestData = ({ topicId, topicType }) => {
    return new Promise(async resolve => {
      const testData = {
        gap: 'gapTestData',
        program: 'programTestData'
      }
      const mongo = app.mongo.get('oj')
      const result = await mongo.find(testData[topicType], {
        query: Object.assign({}, topicType === 'gap' ? { gapId: ObjectID(topicId) } : { programId: ObjectID(topicId) })
      })
      await mongo.deleteMany(testData[topicType], {
        filter: Object.assign({}, topicType === 'gap' ? { gapId: ObjectID(topicId) } : { programId: ObjectID(topicId) })
      })
      for (const item of result) {
        item.inputFile && fs.unlink(path.join(__dirname, '../public/' + item.inputFile), e => e)
        item.outputFile && fs.unlink(path.join(__dirname, '../public/' + item.outputFile), e => e)
      }
      resolve(true)
    })
  }
  const deleteExaminee = ({ userId, examId }) => {
    return new Promise(async resolve => {
      const mongo = app.mongo.get('oj')
      const result = await mongo.find('examinee', {
        query: Object.assign({}, userId ? { _id: ObjectID(userId) } : {}, examId ? { examId: ObjectID(examId) } : {})
      })
      await mongo.deleteMany('examinee', {
        filter: Object.assign({}, userId ? { _id: ObjectID(userId) } : {}, examId ? { examId: ObjectID(examId) } : {})
      })
      for (const item of result) {
        deleteExamAnswer({ userId: item._id, topicType: 'tf' })
        deleteExamAnswer({ userId: item._id, topicType: 'select' })
        deleteExamAnswer({ userId: item._id, topicType: 'gap' })
        deleteExamAnswer({ userId: item._id, topicType: 'program' })
      }
      resolve(true)
    })
  }
  const deleteExam = ({ examId, userId }) => {
    return new Promise(async resolve => {
      const mongo = app.mongo.get('oj')
      const result = await mongo.find('examList', {
        query: Object.assign({}, userId ? { userId: ObjectID(userId) } : {}, examId ? { _id: ObjectID(examId) } : {})
      })
      await mongo.deleteMany('examList', {
        filter: Object.assign({}, userId ? { userId: ObjectID(userId) } : {}, examId ? { _id: ObjectID(examId) } : {})
      })
      for (const item of result) {
        deleteExamTopic({ examId: item._id, topicType: 'tf' })
        deleteExamTopic({ examId: item._id, topicType: 'select' })
        deleteExamTopic({ examId: item._id, topicType: 'gap' })
        deleteExamTopic({ examId: item._id, topicType: 'program' })
        deleteExaminee({ examId: item._id })
      }
      resolve(true)
    })
  }
  const deleteExamAnswer = ({ examId, userId, topicId, topicType }) => {
    return new Promise(async resolve => {
      const mongo = app.mongo.get('oj')
      const answer = {
        tf: 'examTFAnswer',
        select: 'examSelectAnswer',
        gap: 'examGapAnswer',
        program: 'examProgramAnswer'
      }
      await mongo.deleteMany(answer[topicType], {
        filter: Object.assign({}, examId ? { examId: ObjectID(examId) } : {}, topicId ? { topicId: ObjectID(topicId) } : {}, userId ? { userId: ObjectID(userId) } : {})
      })
      resolve(true)
    })
  }
  const deleteExamTestData = ({ topicId, topicType }) => {
    return new Promise(async resolve => {
      const testData = {
        gap: 'examGapTestData',
        program: 'examProgramTestData'
      }
      const mongo = app.mongo.get('oj')
      const result = await mongo.find(testData[topicType], {
        query: Object.assign({}, topicType === 'gap' ? { gapId: ObjectID(topicId) } : { programId: ObjectID(topicId) })
      })
      await mongo.deleteMany(testData[topicType], {
        filter: Object.assign({}, topicType === 'gap' ? { gapId: ObjectID(topicId) } : { programId: ObjectID(topicId) })
      })
      for (const item of result) {
        item.inputFile && fs.unlink(path.join(__dirname, '../public/' + item.inputFile), e => e)
        item.outputFile && fs.unlink(path.join(__dirname, '../public/' + item.outputFile), e => e)
      }
      resolve(true)
    })
  }
  const deleteExamTopic = ({ examId, topicId, topicType }) => {
    return new Promise(async resolve => {
      const mongo = app.mongo.get('oj')
      const topic = {
        tf: 'examTFTopic',
        select: 'examSelectTopic',
        gap: 'examGapTopic',
        program: 'examProgramTopic'
      }
      const result = await mongo.find(topic[topicType], {
        query: Object.assign({}, examId ? { examId: ObjectID(examId) } : {}, topicId ? { _id: ObjectID(topicId) } : {})
      })
      await mongo.deleteMany(topic[topicType], {
        filter: Object.assign({}, examId ? { examId: ObjectID(examId) } : {}, topicId ? { _id: ObjectID(topicId) } : {})
      })
      for (const item of result) {
        deleteExamAnswer({ topicId: item._id })
      }
      if (topicType === 'gap' || topicType === 'program') {
        for (const item of result) {
          deleteExamTestData({ topicId: item._id, topicType })
        }
      }
      resolve(true)
    })
  }
  return {
    deleteUser,
    deleteClasses,
    deleteClassesStudent,
    deleteTopic,
    deleteTestData,
    deleteExaminee,
    deleteExam,
    deleteExamAnswer,
    deleteExamTestData,
    deleteExamTopic
  }
}
