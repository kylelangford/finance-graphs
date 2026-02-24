<script setup lang="ts">
import { useNotifications, type Notification } from '../composables/useNotifications';

const { notifications, removeNotification } = useNotifications();

const getIconForType = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    case 'info':
    default:
      return 'ℹ';
  }
};

const getColorClassesForType = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'bg-green-100 text-green-600',
        progress: 'bg-green-500',
      };
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'bg-red-100 text-red-600',
        progress: 'bg-red-500',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'bg-yellow-100 text-yellow-600',
        progress: 'bg-yellow-500',
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'bg-blue-100 text-blue-600',
        progress: 'bg-blue-500',
      };
  }
};
</script>

<template>
  <div class="fixed top-4 right-4 z-50 space-y-2 max-w-md">
    <TransitionGroup
      name="toast"
      tag="div"
      class="space-y-2"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'flex items-start gap-3 p-4 rounded-2xl shadow-lg border',
          'min-w-[320px] max-w-md',
          'transition-all duration-300 ease-in-out',
          getColorClassesForType(notification.type).bg,
          getColorClassesForType(notification.type).border,
        ]"
        role="alert"
      >
        <div
          :class="[
            'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
            getColorClassesForType(notification.type).icon,
          ]"
        >
          {{ getIconForType(notification.type) }}
        </div>

        <div class="flex-1 min-w-0">
          <p
            :class="[
              'text-sm font-medium',
              getColorClassesForType(notification.type).text,
            ]"
          >
            {{ notification.message }}
          </p>
        </div>

        <button
          @click="removeNotification(notification.id)"
          :class="[
            'flex-shrink-0 ml-2 hover:opacity-70 transition-opacity',
            getColorClassesForType(notification.type).text,
          ]"
          aria-label="Close notification"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
