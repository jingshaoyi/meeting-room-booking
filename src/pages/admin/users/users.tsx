import { View, Text, Input, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getAdminUsers, login, setAdminUserRole } from '../../../utils/store'
import type { AdminUser } from '../../../utils/store'
import '../admin.scss'

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [currentId, setCurrentId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (search = keyword) => {
    setLoading(true)
    setError('')
    try {
      const [list, { user }] = await Promise.all([getAdminUsers(search), login()])
      setUsers(list)
      setCurrentId(user.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '用户加载失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    load()
  })

  const changeRole = (user: AdminUser) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin'
    Taro.showModal({
      title: nextRole === 'admin' ? '设为管理员' : '取消管理员',
      content: nextRole === 'admin'
        ? `确定允许「${user.name}」管理会议室、预约和用户权限吗？`
        : `确定取消「${user.name}」的管理员权限吗？`,
      success: async res => {
        if (!res.confirm) return
        try {
          await setAdminUserRole(user.id, nextRole)
          await load()
          Taro.showToast({ title: '权限已更新', icon: 'none' })
        } catch (err) {
          Taro.showToast({ title: err instanceof Error ? err.message : '权限更新失败', icon: 'none' })
        }
      }
    })
  }

  return (
    <View className='admin-page'>
      <View className='permission-tip'>管理员可处理全部预约并管理用户权限。首个管理员需在云开发控制台设置。</View>
      <View className='search-bar'>
        <Input className='search-input' placeholder='搜索用户姓名或 OpenID' value={keyword} confirmType='search' onInput={e => setKeyword(e.detail.value)} onConfirm={() => load()} />
        <Button className='search-btn' onClick={() => load()}>搜索</Button>
      </View>

      {loading && users.length === 0 ? (
        <View className='state'><Text className='state-text'>正在加载用户...</Text></View>
      ) : error && users.length === 0 ? (
        <View className='state' onClick={() => load()}>
          <Text className='state-text'>加载失败，点击重试</Text>
          <Text className='state-sub'>{error}</Text>
        </View>
      ) : users.length === 0 ? (
        <View className='empty'>未找到用户</View>
      ) : (
        users.map(user => (
          <View key={user.id} className='user-card'>
            <View className='user-main'>
              <View className='user-name-row'>
                <Text className='user-name'>{user.name}</Text>
                <Text className={`role ${user.role === 'admin' ? 'role-admin' : ''}`}>{user.role === 'admin' ? '管理员' : '普通用户'}</Text>
              </View>
              <Text className='user-id'>{user.id}</Text>
            </View>
            {user.id === currentId ? (
              <Text className='self-label'>当前账号</Text>
            ) : (
              <Button className={`btn ${user.role === 'admin' ? 'btn-danger-plain' : 'btn-primary'}`} onClick={() => changeRole(user)}>
                {user.role === 'admin' ? '取消管理员' : '设为管理员'}
              </Button>
            )}
          </View>
        ))
      )}
    </View>
  )
}
