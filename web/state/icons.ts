import { api } from '../api'
import { pushToast } from './toasts'

// Saves a task's icon (or removes it) in the config file. The server then
// rescans and every open tab gets the new tree.
export async function setTaskIcon(taskKey: string, icon: string | null) {
  try {
    const { config } = await api.config()
    const taskIcons = { ...config.taskIcons }
    if (icon) taskIcons[taskKey] = icon
    else delete taskIcons[taskKey]
    await api.saveConfig({ ...config, taskIcons })
  } catch (err) {
    pushToast({ text: 'Could not save the icon', detail: (err as Error).message })
  }
}
