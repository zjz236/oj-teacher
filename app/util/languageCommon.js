'use strict'
const shell = require('shelljs')
const fs = require('fs')
const path = require('path')


const getRandomNumber = () => {
  const { random, round } = Math
  const date = new Date().getTime()
  const r = round(random() * 10) * round(random() * 10)
  return `${date}${r}`
}

const timeDiff = (start, end) => {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  return endTime - startTime
}

const cppRunner = (code, inputData, outputData) => {
  outputData
  return new Promise(resolve => {
    const fileName = getRandomNumber()
    fs.writeFileSync(path.join(`${__dirname}/../public/cpp/${fileName}.cpp`), code, { flags: 'w+' })
    const geterr = shell.exec(`g++ ${path.join(`${__dirname}/../public/cpp/${fileName}.cpp`)} -o ${path.join(`${__dirname}/../public/cpp/${fileName}.o`)}`, { silent: true })
    fs.unlinkSync(path.join(`${__dirname}/../public/cpp/${fileName}.cpp`))
    if (geterr.code) {
      let error = geterr.stderr
      const reg = new RegExp(`${path.join(`${__dirname}/../public/cpp/`)}${fileName}.cpp:`, 'g')
      error = error.replace(reg, '')
      resolve({
        code: 0,
        err: error
      })
      return
    }
    let outputData = ''
    let startTime = null
    let endTime = null
    const child = shell.exec(`${path.join(`${__dirname}/../public/cpp/${fileName}.o`)}`, {
      silent: true,
      async: true,
      timeout: 3000
    })
    if (!inputData) {
      startTime = new Date()
    }
    if (inputData) {
      child.stdin.write(inputData)
      startTime = new Date()
      child.stdin.end()
    }
    child.stdout.on('data', data => {
      endTime = new Date()
      outputData += data
    })
    child.on('close', () => {
      if (endTime === null) {
        endTime = new Date()
      }
      fs.unlinkSync(path.join(`${__dirname}/../public/cpp/${fileName}.o`))
      resolve({
        outputData,
        code: 1,
        timeLimit: timeDiff(startTime, endTime),
        memoryLimit: 0,
        result: 1
      })
    })
  })

}
const cRunner = (code, inputData) => {
  console.log(code, inputData)
}
const javaRunner = (code, inputData) => {
  console.log(code, inputData)
}
const pythonRunner = (code, inputData) => {
  console.log(code, inputData)
}

module.exports = {
  cppRunner,
  cRunner,
  javaRunner,
  pythonRunner,
  getRandomNumber
}
