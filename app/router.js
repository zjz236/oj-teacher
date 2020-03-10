'use strict'

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app
  router.get('/', controller.home.index)
  router.post('/upload', controller.upload.uploadImg)
  router.post('/upload/uploadTestData', controller.upload.uploadTestData)
  router.post('/account/login', controller.account.login)
  router.get('/account/getPublicKey', controller.account.getPublicKey)
  router.post('/account/addUser', controller.account.addUser)
  router.get('/account/getUserInfo', controller.account.getUserInfo)
  router.get('/account/getUserList', controller.account.getUserList)
  router.get('/account/deleteUser', controller.account.deleteUser)
  router.post('/examList/addExam', controller.examList.addExam)
  router.post('/examList/examEdit', controller.examList.examEdit)
  router.get('/examList/getExamList', controller.examList.getExamList)
  router.get('/examList/getExamInfo', controller.examList.getExamInfo)
  router.get('/examList/examAnalysis', controller.examList.examAnalysis)
  router.post('/round/runner', controller.round.runner)
  router.get('/round/getRunnerStatus', controller.round.getRunnerStatus)
  router.post('/classes/addClasses', controller.classes.addClasses)
  router.get('/classes/getClassList', controller.classes.getClassList)
  router.get('/classes/getClassInfo', controller.classes.getClassInfo)
  router.get('/classes/deleteClass', controller.classes.deleteClass)
  router.get('/classes/getClassesStudent', controller.classes.getClassesStudent)
  router.post('/examinee/examineeAdd', controller.examinee.examineeAdd)
  router.post('/examinee/examineeModify', controller.examinee.examineeModify)
  router.get('/examinee/getExamineeAddInfo', controller.examinee.getExamineeAddInfo)
  router.get('/examinee/getExamineeList', controller.examinee.getExamineeList)
  router.get('/examinee/getExamineeInfo', controller.examinee.getExamineeInfo)
  router.get('/examinee/deleteExaminee', controller.examinee.deleteExaminee)
  router.post('/topic/topicModify', controller.topic.topicModify)
  router.get('/topic/getTopicList', controller.topic.getTopicList)
  router.get('/topic/getTopicInfo', controller.topic.getTopicInfo)
  router.get('/topic/deleteTopic', controller.topic.deleteTopic)
  router.post('/testData/gapTest', controller.testData.gapTest)
  router.get('/testData/gapTestStatus', controller.testData.gapTestStatus)
  router.get('/testData/getGapTestInfo', controller.testData.getGapTestInfo)
  router.get('/testData/deleteGapTest', controller.testData.deleteGapTest)
  router.post('/testData/gapTestSubmit', controller.testData.gapTestSubmit)
  router.post('/testData/uploadProgramTest', controller.testData.uploadProgramTest)
  router.get('/testData/getProgramTest', controller.testData.getProgramTest)
  router.get('/testData/deleteProgramTest', controller.testData.deleteProgramTest)
  router.post('/testData/programTest', controller.testData.programTest)
  router.post('/ide/addIDEData', controller.ide.addIDEData)
  router.get('/ide/getIDEData', controller.ide.getIDEData)
  router.get('/examTopic/getExamTopicNum', controller.examTopic.getExamTopicNum)
  router.get('/examTopic/getExamTransferTopic', controller.examTopic.getExamTransferTopic)
  router.get('/examTopic/getExamTopicList', controller.examTopic.getExamTopicList)
  router.get('/examTopic/getExamTopicInfo', controller.examTopic.getExamTopicInfo)
  router.post('/examTopic/examTopicTransfer', controller.examTopic.examTopicTransfer)
  router.post('/examTopic/modifyExamTopic', controller.examTopic.modifyExamTopic)
  router.get('/examTopic/deleteExamTopic', controller.examTopic.deleteExamTopic)
  router.get('/examTopic/getAllExamTopic', controller.examTopic.getAllExamTopic)
  router.get('/grade/tfGrade', controller.grade.tfGrade)
  router.get('/grade/selectGrade', controller.grade.selectGrade)
  router.get('/grade/gapGrade', controller.grade.gapGrade)
  router.get('/grade/programGrade', controller.grade.programGrade)
  router.get('/grade/gradeExport/:examId', controller.grade.gradeExport)
}
