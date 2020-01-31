'use strict'
const fs = require('fs')
const path = require('path')

module.exports = app => {
  return {
    putFile(fileName, filePath) {
      return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
          reject(new Error('文件不存在'))
          return
        }
        try {
          const data = fs.readFileSync(filePath)
          fs.writeFileSync(path.join(__dirname, '../public/' + fileName), data)
          resolve({
            name: fileName,
            url: app.config.configUrl + 'public/' + fileName
          })
        } catch (err) {
          reject(new Error(err))
        }
      })
    },
    getFile(fileName) {
      return new Promise((resolve, reject) => {
        if (!fs.existsSync(path.join(__dirname, '../public/' + fileName))) {
          reject(new Error('文件不存在'))
          return
        }
        try {
          const data = fs.readFileSync(fileName)
          resolve(data)
        } catch (err) {
          reject(new Error(err))
        }
      })
    },
    deleteFile(fileName) {
      return new Promise((resolve, reject) => {
        if (!fs.existsSync(path.join(__dirname, '../public/' + fileName))) {
          reject(new Error('文件不存在'))
          return
        }
        try {
          fs.unlinkSync(path.join(__dirname, '../public/' + fileName))
          resolve(true)
        } catch (err) {
          reject(new Error(err))
        }
      })
    }
  }
}
