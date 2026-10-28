import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { initCloud } from './utils/cloud'
import { login } from './utils/store'

import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    if (process.env.TARO_ENV !== 'weapp') return
    initCloud()
    login().catch(error => {
      console.error('云开发登录失败', error)
    })
  })

  return children
}

export default App
