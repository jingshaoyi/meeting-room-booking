import Taro from '@tarojs/taro'

/** 留空时使用当前小程序的默认云开发环境；多环境项目填写目标环境 ID。 */
export const CLOUD_ENV = 'cloud1-9gy5ft0778d33f66'

interface CloudResponse<T> {
  code: number
  message?: string
  data: T
}

export function initCloud(): void {
  if (process.env.TARO_ENV !== 'weapp') return
  Taro.cloud.init({ env: CLOUD_ENV || undefined, traceUser: true })
}

export async function callCloud<T>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  if (process.env.TARO_ENV !== 'weapp') {
    throw new Error('真实云端数据请在微信小程序中查看')
  }

  try {
    const response = await Taro.cloud.callFunction({ name, data })
    const result = response.result as CloudResponse<T> | undefined
    if (!result || typeof result !== 'object') throw new Error('云服务返回格式异常')
    if (result.code !== 0) throw new Error(result.message || '云服务调用失败')
    return result.data
  } catch (error) {
    if (error instanceof Error) throw error
    const callbackError = error as { errMsg?: string } | null
    const errMsg = callbackError ? callbackError.errMsg : ''
    throw new Error(errMsg || '云服务调用失败，请稍后重试')
  }
}
