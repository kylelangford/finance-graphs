import { ref } from 'vue';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
}

const notifications = ref<Notification[]>([]);

export function useNotifications() {
  const addNotification = (
    message: string,
    type: NotificationType = 'info',
    duration: number = 5000
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const notification: Notification = {
      id,
      message,
      type,
      duration,
    };

    notifications.value.push(notification);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  };

  const clearAll = () => {
    notifications.value = [];
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  };
}
