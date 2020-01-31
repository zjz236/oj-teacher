/* eslint valid-jsdoc: "off" */

'use strict'

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {}

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1576245726625_7485'

  // add your middleware config here
  config.middleware = []
  config.mongo = {
    clients: {
      oj: {
        host: 'localhost',
        port: '27017',
        name: 'zjyc-oj',
        user: 'zjz236',
        password: 'zjz1236'
      }
    }
  }
  config.multipart = {
    mode: 'file',
    fileSize: '50mb',
    whitelist: [
      // images
      '.jpg', '.jpeg', // image/jpeg
      '.png', // image/png, image/x-png
      '.gif', // image/gif
      '.bmp', // image/bmp
      '.wbmp', // image/vnd.wap.wbmp
      '.webp',
      '.tif',
      '.psd',
      // text
      '.svg',
      '.js', '.jsx',
      '.json',
      '.css', '.less',
      '.html', '.htm',
      '.xml',
      // tar
      '.zip',
      '.gz', '.tgz', '.gzip',
      // video
      '.mp3',
      '.mp4',
      '.avi',
      '.in',
      '.out'
    ]
  }
  config.security = {
    csrf: {
      enable: false
    }
  }
  config.middleware = [ 'jwt' ]
  // jwt配置
  config.jwt = {
    ignore: [ '/oj/account/login', '/oj/round/runner', '/oj/upload' ]
  }
  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH'
  }
  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
    configUrl: 'http://127.0.0.1:7001/'
  }


  return {
    ...config,
    ...userConfig
  }
}
