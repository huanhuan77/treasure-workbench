import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { setPublishDays, N_PUBLISH_DAYS } from '../utils/publish'

export default function SettingsPage() {
  const { settings, updateSettings } = useStore()
  const current = settings?.publishReminderDays || N_PUBLISH_DAYS
  const [val, setVal] = useState(String(current))

  useEffect(() => { setPublishDays(settings?.publishReminderDays || N_PUBLISH_DAYS) }, [settings?.publishReminderDays])

  const save = () => {
    const n = Math.round(Number(val))
    if (!Number.isFinite(n) || n < 1 || n > 365) return
    updateSettings({ publishReminderDays: n })
    setPublishDays(n)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 80px' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 16px' }}>设置</h2>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '16px', boxShadow: '0 1px 3px rgba(120,90,100,0.06)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>发布提醒 · 出单产品多少天没发才提醒</div>
        <p style={{ fontSize: 12, color: '#8a8f98', lineHeight: 1.6, margin: '0 0 12px' }}>
          出过单的产品，如果某个账号超过这个天数没发新视频，就会出现在「发布提醒」里。默认 {N_PUBLISH_DAYS} 天。
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="number"
            min={1}
            max={365}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={save}
            style={{ width: 90, padding: '10px 12px', fontSize: 15, borderRadius: 10, border: '1.5px solid #e2e8f0', outline: 'none' }}
          />
          <span style={{ fontSize: 13, color: '#64748b' }}>天</span>
          <button
            onClick={save}
            style={{ marginLeft: 'auto', padding: '10px 18px', borderRadius: 10, border: 'none', background: '#ec4899', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >保存</button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16, lineHeight: 1.6 }}>
        这个设置会随数据一起云端同步，换设备登录后保持一致。
      </p>
    </div>
  )
}
