import { SampleForm } from '../../components/SampleForm'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'

// PC 版「新增/编辑样品」对话框。
// 用户要求：PC 上的按钮操作都走弹窗、不跳页面。
// 表单本体复用手机版的共用组件 SampleForm（它自带 Modal），这里只负责接 store：
// sample 传 undefined/null = 新增。
export function SampleDialog({ sample, onClose }) {
  const { addSample, updateSample, deleteSample } = useStore()
  const { show } = useToast()

  const isNew = !sample

  return (
    <SampleForm
      sample={sample || undefined}
      // inline 默认是 true（表单直接铺在页面里，不带遮罩）—— 这里要的是弹窗，必须显式关掉
      inline={false}
      onClose={onClose}
      onSave={(f) => {
        if (isNew) {
          addSample(f)
          show('样品已添加', 'success')
        } else {
          updateSample(sample.id, f)
          show('已保存', 'success')
        }
        onClose()
      }}
      onDelete={isNew ? undefined : () => {
        if (!window.confirm('删除该样品？')) return
        deleteSample(sample.id)
        show('已删除', 'success')
        onClose()
      }}
    />
  )
}
