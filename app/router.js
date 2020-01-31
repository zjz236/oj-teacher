'use strict'

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app
  router.get('/', controller.home.index)
  router.post('/oj/ide', controller.home.ide)
  router.post('/oj/upload', controller.upload.uploadImg)
  router.post('/oj/account/login', controller.account.login)
  router.post('/oj/account/addUser', controller.account.addUser)
  router.get('/oj/account/getUserInfo', controller.account.getUserInfo)
  router.post('/oj/examList/addExam', controller.examList.addExam)
  router.post('/oj/examList/examEdit', controller.examList.examEdit)
  router.get('/oj/examList/getExamList', controller.examList.getExamList)
  router.get('/oj/examList/getExamInfo', controller.examList.getExamInfo)
  router.get('/oj/round/runner', controller.round.runner)
  router.post('/oj/classes/addClasses', controller.classes.addClasses)
  router.get('/oj/classes/getClassList', controller.classes.getClassList)
  router.get('/oj/classes/getClassInfo', controller.classes.getClassInfo)
  router.get('/oj/classes/deleteClass', controller.classes.deleteClass)
  router.get('/oj/classes/getClassesStudent', controller.classes.getClassesStudent)
  router.post('/oj/examinee/examineeAdd', controller.examinee.examineeAdd)
  router.post('/oj/examinee/examineeModify', controller.examinee.examineeModify)
  router.get('/oj/examinee/getExamineeAddInfo', controller.examinee.getExamineeAddInfo)
  router.get('/oj/examinee/getExamineeList', controller.examinee.getExamineeList)
  router.get('/oj/examinee/getExamineeInfo', controller.examinee.getExamineeInfo)
  router.get('/oj/examinee/deleteExaminee', controller.examinee.deleteExaminee)
  router.post('/oj/topic/topicModify', controller.topic.topicModify)
  router.get('/oj/topic/getTopicList', controller.topic.getTopicList)
  router.get('/oj/topic/getTopicInfo', controller.topic.getTopicInfo)
  router.get('/oj/topic/deleteTopic', controller.topic.deleteTopic)
  router.post('/oj/testData/gapTest', controller.testData.gapTest)
  router.get('/oj/testData/gapTestStatus', controller.testData.gapTestStatus)
  router.get('/oj/testData/getGapTestInfo', controller.testData.getGapTestInfo)
  router.get('/oj/testData/deleteGapTest', controller.testData.deleteGapTest)
  router.post('/oj/testData/gapTestSubmit', controller.testData.gapTestSubmit)
}
