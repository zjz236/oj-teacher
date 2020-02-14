'use strict'

const Controller = require('egg').Controller
const ObjectID = require('mongodb').ObjectID
const nodeExcel = require('excel-export')

class GradeController extends Controller {
  async tfGrade() {
    const { ctx, app } = this
    try {
      const { examId } = ctx.request.query
      const mongo = app.mongo.get('oj')
      const { value } = await mongo.findOneAndUpdate('examList', {
        filter: {
          _id: ObjectID(examId)
        },
        update: {
          $set: {
            tfStatus: 1
          }
        }
      })
      if (!value) {
        return ctx.body = {
          code: 0,
          msg: '系统异常'
        }
      }
      ctx.body = {
        code: 1,
        msg: 'success'
      }
      await mongo.updateMany('examinee', {
        filter: {
          examId: ObjectID(examId)
        },
        update: {
          $set: {
            tfScore: 0
          }
        }
      })
      new Promise(async resolve => {
        try {
          const result = await mongo.aggregate('examTFAnswer', {
            pipeline: [
              {
                $lookup: {
                  from: 'examTFTopic',
                  localField: 'topicId',
                  foreignField: '_id',
                  as: 'topic'
                }
              },
              {
                $match: {
                  examId: ObjectID(examId)
                }
              }
            ]
          })
          const promise = []
          for (const item of result) {
            const pro = new Promise(async resolve1 => {
              await mongo.findOneAndUpdate('examTFAnswer', {
                filter: {
                  _id: ObjectID(item._id)
                },
                update: {
                  $set: {
                    result: item.answer === item.topic[0].answer
                  }
                }
              })
              if (item.answer === item.topic[0].answer) {
                await mongo.findOneAndUpdate('examinee', {
                  filter: {
                    _id: ObjectID(item.userId)
                  },
                  update: {
                    $inc: {
                      tfScore: 2
                    }
                  }
                })
              }
              resolve1(true)
            })
            promise.push(pro)
          }
          if (!promise.length) {
            await mongo.findOneAndUpdate('examList', {
              filter: {
                _id: ObjectID(examId)
              },
              update: {
                $set: {
                  tfStatus: 2
                }
              }
            })
            await mongo.updateMany('examTFTopic', {
              filter: {
                examId: ObjectID(examId)
              },
              update: {
                $set: {
                  grade: true
                }
              }
            })
            resolve(true)
          }
          Promise.all(promise)
            .then(async () => {
              await mongo.findOneAndUpdate('examList', {
                filter: {
                  _id: ObjectID(examId)
                },
                update: {
                  $set: {
                    tfStatus: 2
                  }
                }
              })
              await mongo.updateMany('examTFTopic', {
                filter: {
                  examId: ObjectID(examId)
                },
                update: {
                  $set: {
                    grade: true
                  }
                }
              })
              resolve(true)
            })
        } catch (e) {
          console.error(e)
          await mongo.findOneAndUpdate('examList', {
            filter: {
              _id: ObjectID(examId)
            },
            update: {
              $set: {
                tfStatus: 0
              }
            }
          })
          await mongo.updateMany('examTFTopic', {
            filter: {
              examId: ObjectID(examId)
            },
            update: {
              $set: {
                grade: true
              }
            }
          })
          resolve(true)
        }
      })
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }

  async selectGrade() {
    const { ctx, app } = this
    try {
      const { examId } = ctx.request.query
      const mongo = app.mongo.get('oj')
      const { value } = await mongo.findOneAndUpdate('examList', {
        filter: {
          _id: ObjectID(examId)
        },
        update: {
          $set: {
            selectStatus: 1
          }
        }
      })
      if (!value) {
        return ctx.body = {
          code: 0,
          msg: '系统异常'
        }
      }

      ctx.body = {
        code: 1,
        msg: 'success'
      }
      await mongo.updateMany('examinee', {
        filter: {
          examId: ObjectID(examId)
        },
        update: {
          $set: {
            selectScore: 0
          }
        }
      })
      new Promise(async resolve => {
        try {
          const result = await mongo.aggregate('examSelectAnswer', {
            pipeline: [
              {
                $lookup: {
                  from: 'examSelectTopic',
                  localField: 'topicId',
                  foreignField: '_id',
                  as: 'topic'
                }
              },
              {
                $match: {
                  examId: ObjectID(examId)
                }
              }
            ]
          })
          const promise = []
          for (const item of result) {
            const pro = new Promise(async resolve1 => {
              await mongo.findOneAndUpdate('examSelectAnswer', {
                filter: {
                  _id: ObjectID(item._id)
                },
                update: {
                  $set: {
                    result: item.answer === item.topic[0].answer
                  }
                }
              })
              if (item.answer === item.topic[0].answer) {
                await mongo.findOneAndUpdate('examinee', {
                  filter: {
                    _id: ObjectID(item.userId)
                  },
                  update: {
                    $inc: {
                      selectScore: 2
                    }
                  }
                })
              }
              resolve1(true)
            })
            promise.push(pro)
          }
          if (!promise.length) {
            await mongo.findOneAndUpdate('examList', {
              filter: {
                _id: ObjectID(examId)
              },
              update: {
                $set: {
                  selectStatus: 2
                }
              }
            })
            await mongo.updateMany('examSelectTopic', {
              filter: {
                examId: ObjectID(examId)
              },
              update: {
                $set: {
                  grade: true
                }
              }
            })
            resolve(true)
          }
          Promise.all(promise)
            .then(async () => {
              await mongo.findOneAndUpdate('examList', {
                filter: {
                  _id: ObjectID(examId)
                },
                update: {
                  $set: {
                    selectStatus: 2
                  }
                }
              })
              await mongo.updateMany('examSelectTopic', {
                filter: {
                  examId: ObjectID(examId)
                },
                update: {
                  $set: {
                    grade: true
                  }
                }
              })
              resolve(true)
            })
        } catch (e) {
          console.error(e)
          await mongo.findOneAndUpdate('examList', {
            filter: {
              _id: ObjectID(examId)
            },
            update: {
              $set: {
                selectStatus: 0
              }
            }
          })
          await mongo.updateMany('examSelectTopic', {
            filter: {
              examId: ObjectID(examId)
            },
            update: {
              $set: {
                grade: true
              }
            }
          })
          resolve(true)
        }
      })
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }

  async gapGrade() {
    const { ctx, app } = this
    try {
      const { examId } = ctx.request.query
      const mongo = app.mongo.get('oj')
      const { value } = await mongo.findOneAndUpdate('examList', {
        filter: {
          _id: ObjectID(examId)
        },
        update: {
          $set: {
            gapStatus: 1
          }
        }
      })
      if (!value) {
        return ctx.body = {
          code: 0,
          msg: '系统异常'
        }
      }
      ctx.body = {
        code: 1,
        msg: 'success'
      }
      await mongo.updateMany('examinee', {
        filter: {
          examId: ObjectID(examId)
        },
        update: {
          $set: {
            gapScore: 0
          }
        }
      })
      new Promise(async resolve => {
        try {
          const result = await mongo.aggregate('examGapAnswer', {
            pipeline: [
              {
                $lookup: {
                  from: 'examGapTopic',
                  localField: 'topicId',
                  foreignField: '_id',
                  as: 'topic'
                }
              },
              {
                $lookup: {
                  from: 'examGapTestData',
                  localField: 'topicId',
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
          const { gapCodeShow } = ctx.helper.util
          const promise = []
          for (const item of result) {
            const pro = new Promise(async (resolve1, reject1) => {
              await mongo.findOneAndUpdate('examGapAnswer', {
                filter: { _id: ObjectID(item._id) },
                update: { $set: { score: 0 } }
              })
              const { insertedId } = await mongo.insertOne('processResult', {
                doc: {
                  inputFile: item.testData[0].inputFile,
                  outputFile: item.testData[0].outputFile,
                  code: gapCodeShow(item.topic[0].code, item.answer),
                  language: value.language,
                  memoryLimit: 100000,
                  timeLimit: 10000,
                  status: 'Queuing',
                  isIDE: false
                }
              })
              if (!insertedId) {
                reject1(new Error('false'))
              }
              const result = new Array(item.answer.length)
              const status = await new Promise(resolve2 => {
                const time = setInterval(async () => {
                  const { status } = await mongo.findOne('processResult', {
                    query: {
                      _id: ObjectID(insertedId)
                    }
                  })
                  if ([ 'Queuing', 'Running' ].indexOf(status) < 0) {
                    resolve2(status)
                    clearInterval(time)
                  }
                }, 200)
              })
              if ([ 'Accepted', 'Presentation Error' ].indexOf(status) >= 0) {
                result.fill(true)
                await mongo.findOneAndUpdate('examGapAnswer', {
                  filter: { _id: ObjectID(item._id) },
                  update: { $set: { score: item.topic[0].gaps.length * 2, result } }
                })
                await mongo.findOneAndUpdate('examinee', {
                  filter: { _id: ObjectID(item.userId) },
                  update: { $inc: { gapScore: item.topic[0].gaps.length * 2 } }
                })
                resolve1(true)
                return
              }
              const promise1 = []
              for (const index in item.answer) {
                const pro1 = new Promise(async resolve2 => {
                  const gaps = [ ...item.topic[0].gaps ]
                  gaps[index] = item.answer[index]
                  const { insertedId } = await mongo.insertOne('processResult', {
                    doc: {
                      inputFile: item.testData[0].inputFile,
                      outputFile: item.testData[0].outputFile,
                      code: gapCodeShow(item.topic[0].code, gaps),
                      language: value.language,
                      memoryLimit: 100000,
                      timeLimit: 10000,
                      status: 'Queuing',
                      isIDE: false
                    }
                  })
                  const status = await new Promise(resolve3 => {
                    const time = setInterval(async () => {
                      const { status } = await mongo.findOne('processResult', {
                        query: {
                          _id: ObjectID(insertedId)
                        }
                      })
                      if ([ 'Queuing', 'Running' ].indexOf(status) < 0) {
                        resolve3(status)
                        clearInterval(time)
                      }
                    }, 200)
                  })
                  if ([ 'Accepted', 'Presentation Error' ].indexOf(status) >= 0) {
                    result[index] = true
                    await mongo.findOneAndUpdate('examGapAnswer', {
                      filter: { _id: ObjectID(item._id) },
                      update: { $inc: { score: 2, result } }
                    })
                    await mongo.findOneAndUpdate('examinee', {
                      filter: { _id: ObjectID(item.userId) },
                      update: { $inc: { gapScore: 2 } }
                    })
                  } else {
                    result[index] = false
                    await mongo.findOneAndUpdate('examGapAnswer', {
                      filter: { _id: ObjectID(item._id) },
                      update: { $inc: { score: 2, result } }
                    })
                  }
                  resolve2(true)
                })
                promise1.push(pro1)
              }
              await Promise.all(promise1)
              resolve1(true)
            })
            promise.push(pro)
          }
          if (!promise.length) {
            await mongo.findOneAndUpdate('examList', {
              filter: {
                _id: ObjectID(examId)
              },
              update: {
                $set: {
                  gapStatus: 2
                }
              }
            })
            resolve(true)
            await mongo.updateMany('examGapTopic', {
              filter: {
                examId: ObjectID(examId)
              },
              update: {
                $set: {
                  grade: true
                }
              }
            })
          }
          Promise.all(promise)
            .then(async () => {
              await mongo.findOneAndUpdate('examList', {
                filter: {
                  _id: ObjectID(examId)
                },
                update: {
                  $set: {
                    gapStatus: 2
                  }
                }
              })
              await mongo.updateMany('examGapTopic', {
                filter: {
                  examId: ObjectID(examId)
                },
                update: {
                  $set: {
                    grade: true
                  }
                }
              })
              resolve(true)
            })
        } catch (e) {
          console.error(e)
          await mongo.findOneAndUpdate('examList', {
            filter: {
              _id: ObjectID(examId)
            },
            update: {
              $set: {
                gapStatus: 0
              }
            }
          })
          await mongo.updateMany('examGapTopic', {
            filter: {
              examId: ObjectID(examId)
            },
            update: {
              $set: {
                grade: true
              }
            }
          })
          resolve(true)
        }
      })
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }

  async programGrade() {
    const { ctx, app } = this
    try {
      const { examId } = ctx.request.query
      const mongo = app.mongo.get('oj')
      const { value } = await mongo.findOneAndUpdate('examList', {
        filter: {
          _id: ObjectID(examId)
        },
        update: {
          $set: {
            programStatus: 1
          }
        }
      })
      if (!value) {
        return ctx.body = {
          code: 0,
          msg: '系统异常'
        }
      }
      ctx.body = {
        code: 1,
        msg: 'success'
      }
      await mongo.updateMany('examinee', {
        filter: {
          examId: ObjectID(examId)
        },
        update: {
          $set: {
            programScore: 0
          }
        }
      })
      new Promise(async resolve => {
        try {
          const result = await mongo.aggregate('examProgramAnswer', {
            pipeline: [
              {
                $lookup: {
                  from: 'examProgramTopic',
                  localField: 'topicId',
                  foreignField: '_id',
                  as: 'topic'
                }
              },
              {
                $lookup: {
                  from: 'examProgramTestData',
                  localField: 'topicId',
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
          const promise = []
          for (const item of result) {
            const pro = new Promise(async resolve1 => {
              await mongo.findOneAndUpdate('examProgramAnswer', {
                filter: { _id: ObjectID(item._id) },
                update: { $set: { score: 0 } }
              })
              const status = []
              const docs = []
              for (const it of item.testData) {
                docs.push({
                  inputFile: it.inputFile,
                  outputFile: it.outputFile,
                  code: item.code,
                  language: value.language,
                  memoryLimit: item.topic[0].memoryLimit,
                  timeLimit: item.topic[0].timeLimit,
                  status: 'Queuing',
                  isIDE: false
                })
              }
              const { insertedIds } = await mongo.insertMany('processResult', {
                docs
              })
              for (const insertedId in insertedIds) {
                status.push({
                  testId: item.testData[insertedId]._id,
                  resultId: insertedIds[insertedId],
                  status: 'Queuing',
                  errMsg: ''
                })
              }
              await mongo.findOneAndUpdate('examProgramAnswer', {
                filter: {
                  _id: ObjectID(item._id)
                },
                update: {
                  $set: {
                    status
                  }
                }
              })
              const promise1 = []
              for (const index in status) {
                const pro1 = new Promise(resolve2 => {
                  const timer = setInterval(async () => {
                    const result = await mongo.findOne('processResult', {
                      query: {
                        _id: ObjectID(status[index].resultId)
                      }
                    })
                    status[index].status = result.status
                    status[index].errMsg = result.errMsg
                    await mongo.findOneAndUpdate('examProgramAnswer', {
                      filter: {
                        _id: ObjectID(item._id)
                      },
                      update: {
                        $set: {
                          status
                        }
                      }
                    })
                    if ([ 'Queuing', 'Running' ].indexOf(result.status) < 0) {
                      if (result.status === 'Accepted' || result.status === 'Presentation Error') {
                        await mongo.findOneAndUpdate('examProgramAnswer', {
                          filter: {
                            _id: ObjectID(item._id)
                          },
                          update: {
                            $inc: {
                              score: 10
                            }
                          }
                        })
                        await mongo.findOneAndUpdate('examinee', {
                          filter: {
                            _id: ObjectID(item.userId)
                          },
                          update: {
                            $inc: {
                              programScore: 10
                            }
                          }
                        })
                      }
                      clearInterval(timer)
                      resolve2(true)
                    }
                  }, 200)
                })
                promise1.push(pro1)
              }
              if (promise1.length === 0) {
                resolve1(true)
                return
              }
              await Promise.all(promise1)
              resolve1(true)
            })
            promise.push(pro)
          }
          if (!promise.length) {
            await mongo.findOneAndUpdate('examList', {
              filter: {
                _id: ObjectID(examId)
              },
              update: {
                $set: {
                  programStatus: 2
                }
              }
            })
            await mongo.updateMany('examProgramTopic', {
              filter: {
                examId: ObjectID(examId)
              },
              update: {
                $set: {
                  grade: true
                }
              }
            })
            resolve(true)
          }
          Promise.all(promise)
            .then(async () => {
              await mongo.findOneAndUpdate('examList', {
                filter: {
                  _id: ObjectID(examId)
                },
                update: {
                  $set: {
                    programStatus: 2
                  }
                }
              })
              await mongo.updateMany('examProgramTopic', {
                filter: {
                  examId: ObjectID(examId)
                },
                update: {
                  $set: {
                    grade: true
                  }
                }
              })
              resolve(true)
            })
        } catch (e) {
          console.error(e)
          await mongo.findOneAndUpdate('examList', {
            filter: {
              _id: ObjectID(examId)
            },
            update: {
              $set: {
                tfStatus: 0
              }
            }
          })
          await mongo.updateMany('examTFTopic', {
            filter: {
              examId: ObjectID(examId)
            },
            update: {
              $set: {
                grade: true
              }
            }
          })
          resolve(true)
        }
      })
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }

  async gradeExport() {
    const { ctx, app } = this
    try {
      const mongo = app.mongo.get('oj')
      const { examId } = ctx.params
      const conf = {}
      conf.name = 'mysheet'
      const result = await mongo.find('examinee', {
        query: {
          examId: ObjectID(examId)
        }
      })
      const array = []
      for (const item of result) {
        array.push([
          item.studentId,
          item.name,
          item.sex === 1 ? '男' : '女',
          item.tfScore,
          item.selectScore,
          item.gapScore,
          item.programScore,
          parseInt(item.tfScore) + parseInt(item.selectScore) + parseInt(item.gapScore) + parseInt(item.programScore)
        ])
      }
      conf.cols = [
        {
          caption: '学号',
          type: 'string'
        },
        {
          caption: '姓名',
          type: 'string'
        },
        {
          caption: '性别',
          type: 'string'
        },
        {
          caption: '判断题分数',
          type: 'number'
        },
        {
          caption: '选择题分数',
          type: 'number'
        },
        {
          caption: '程序填空题分数',
          type: 'number'
        },
        {
          caption: '程序设计题分数',
          type: 'number'
        },
        {
          caption: '总分',
          type: 'number'
        }
      ]
      conf.rows = array
      const res = nodeExcel.execute(conf)
      const data = new Buffer(res, 'binary')
      ctx.set('Content-Type', 'application/vnd.openxmlformats')
      ctx.set('Content-Disposition', 'attachment; filename=Report.xlsx')
      ctx.body = data
    } catch (e) {
      console.error(e)
      ctx.body = {
        code: 0,
        msg: '系统异常'
      }
    }
  }
}

module.exports = GradeController
