import { View, Text, Input, Button, Switch } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { createAdminRoom, getAdminRooms, removeAdminRoom, updateAdminRoom } from '../../../utils/store'
import type { AdminRoom } from '../../../utils/store'
import '../admin.scss'

const EMPTY_FORM = {
  name: '',
  location: '',
  capacity: '',
  facilities: '',
  requiresApproval: false,
  sort: '0'
}

export default function Rooms() {
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formVisible, setFormVisible] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = async (search = keyword) => {
    setLoading(true)
    setError('')
    try {
      setRooms(await getAdminRooms(search))
    } catch (err) {
      setError(err instanceof Error ? err.message : '会议室加载失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    load()
  })

  const openCreate = () => {
    setEditingId('')
    setForm(EMPTY_FORM)
    setFormVisible(true)
  }

  const openEdit = (room: AdminRoom) => {
    setEditingId(room.id)
    setForm({
      name: room.name,
      location: room.location,
      capacity: String(room.capacity),
      facilities: room.facilities.join('，'),
      requiresApproval: room.requiresApproval,
      sort: String(room.sort)
    })
    setFormVisible(true)
  }

  const save = async () => {
    const capacity = Number(form.capacity)
    const sort = Number(form.sort)
    if (!form.name.trim() || !form.location.trim()) {
      Taro.showToast({ title: '请填写名称和位置', icon: 'none' })
      return
    }
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isInteger(sort) || sort < 0) {
      Taro.showToast({ title: '请填写正确的容量和排序', icon: 'none' })
      return
    }

    setSaving(true)
    try {
      const input = {
        name: form.name.trim(),
        location: form.location.trim(),
        capacity,
        facilities: form.facilities.split(/[,，]/).map(item => item.trim()).filter(Boolean),
        requiresApproval: form.requiresApproval,
        sort
      }
      if (editingId) await updateAdminRoom(editingId, input)
      else await createAdminRoom(input)
      setFormVisible(false)
      await load()
      Taro.showToast({ title: editingId ? '已保存' : '已新增', icon: 'none' })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const toggle = (room: AdminRoom) => {
    const nextStatus = room.status === 'active' ? 'inactive' : 'active'
    Taro.showModal({
      title: nextStatus === 'active' ? '启用会议室' : '停用会议室',
      content: `确定${nextStatus === 'active' ? '启用' : '停用'}「${room.name}」吗？`,
      success: async res => {
        if (!res.confirm) return
        try {
          await updateAdminRoom(room.id, { status: nextStatus })
          await load()
        } catch (err) {
          Taro.showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
        }
      }
    })
  }

  const remove = (room: AdminRoom) => {
    Taro.showModal({
      title: '删除会议室',
      content: '无预约记录时将直接删除；有历史预约时将自动改为停用。',
      confirmColor: '#e5484d',
      success: async res => {
        if (!res.confirm) return
        try {
          const result = await removeAdminRoom(room.id)
          await load()
          Taro.showToast({ title: result.removed ? '已删除' : '已改为停用', icon: 'none' })
        } catch (err) {
          Taro.showToast({ title: err instanceof Error ? err.message : '删除失败', icon: 'none' })
        }
      }
    })
  }

  return (
    <View className='admin-page'>
      <View className='search-bar'>
        <Input
          className='search-input'
          placeholder='搜索名称或位置'
          value={keyword}
          confirmType='search'
          onInput={e => setKeyword(e.detail.value)}
          onConfirm={() => load()}
        />
        <Button className='search-btn' onClick={() => load()}>搜索</Button>
        <Button className='add-btn' onClick={openCreate}>新增</Button>
      </View>

      {formVisible && (
        <View className='form-card'>
          <Text className='form-title'>{editingId ? '编辑会议室' : '新增会议室'}</Text>
          <View className='field'>
            <Text className='field-label'>名称</Text>
            <Input className='field-input' maxlength={20} value={form.name} placeholder='如：云顶厅' onInput={e => setForm({ ...form, name: e.detail.value })} />
          </View>
          <View className='field'>
            <Text className='field-label'>位置</Text>
            <Input className='field-input' maxlength={50} value={form.location} placeholder='如：A 座 12F' onInput={e => setForm({ ...form, location: e.detail.value })} />
          </View>
          <View className='field-inline'>
            <View className='field field-half'>
              <Text className='field-label'>容纳人数</Text>
              <Input className='field-input' type='number' value={form.capacity} onInput={e => setForm({ ...form, capacity: e.detail.value })} />
            </View>
            <View className='field field-half'>
              <Text className='field-label'>排序</Text>
              <Input className='field-input' type='number' value={form.sort} onInput={e => setForm({ ...form, sort: e.detail.value })} />
            </View>
          </View>
          <View className='field'>
            <Text className='field-label'>设施（用逗号分隔）</Text>
            <Input className='field-input' value={form.facilities} placeholder='投影，白板，视频会议' onInput={e => setForm({ ...form, facilities: e.detail.value })} />
          </View>
          <View className='switch-row'>
            <Text>预约后需要管理员审批</Text>
            <Switch checked={form.requiresApproval} color='#2f54eb' onChange={e => setForm({ ...form, requiresApproval: e.detail.value })} />
          </View>
          <View className='form-actions'>
            <Button className='btn btn-plain' onClick={() => setFormVisible(false)}>取消</Button>
            <Button className='btn btn-primary' loading={saving} disabled={saving} onClick={save}>保存</Button>
          </View>
        </View>
      )}

      {loading && rooms.length === 0 ? (
        <View className='state'><Text className='state-text'>正在加载会议室...</Text></View>
      ) : error && rooms.length === 0 ? (
        <View className='state' onClick={() => load()}>
          <Text className='state-text'>加载失败，点击重试</Text>
          <Text className='state-sub'>{error}</Text>
        </View>
      ) : rooms.length === 0 ? (
        <View className='empty'>暂无会议室</View>
      ) : (
        rooms.map(room => (
          <View key={room.id} className='room-card'>
            <View className='card-head'>
              <View className='room-info'>
                <Text className='room-name'>{room.name}</Text>
                <Text className='room-sub'>{room.location} · {room.capacity} 人 · 排序 {room.sort}</Text>
              </View>
              <Text className={`status ${room.status === 'active' ? 'status-approved' : 'status-cancelled'}`}>
                {room.status === 'active' ? '已启用' : '已停用'}
              </Text>
            </View>
            <View className='tags'>
              {room.facilities.map(item => <Text key={item} className='tag'>{item}</Text>)}
              {room.requiresApproval && <Text className='tag'>需审批</Text>}
            </View>
            <View className='card-actions'>
              <Button className='btn btn-plain' onClick={() => openEdit(room)}>编辑</Button>
              <Button className='btn btn-plain' onClick={() => toggle(room)}>{room.status === 'active' ? '停用' : '启用'}</Button>
              <Button className='btn btn-danger-plain' onClick={() => remove(room)}>删除</Button>
            </View>
          </View>
        ))
      )}
    </View>
  )
}
