<script setup lang="ts">
import type { Category } from '../types/transaction';

const props = defineProps<{
  category?: Category;
  size?: 'sm' | 'md' | 'lg';
}>();

const colorClasses: Record<string, string> = {
  green: 'bg-green-100 text-green-800',
  orange: 'bg-orange-100 text-orange-800',
  blue: 'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  purple: 'bg-purple-100 text-purple-800',
  red: 'bg-red-100 text-red-800',
  pink: 'bg-pink-100 text-pink-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  gray: 'bg-gray-100 text-gray-800',
  slate: 'bg-slate-100 text-slate-800',
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const getColorClass = () => {
  if (!props.category) {
    return 'bg-gray-100 text-gray-500';
  }
  return colorClasses[props.category.color] || 'bg-gray-100 text-gray-800';
};

const getSizeClass = () => {
  return sizeClasses[props.size || 'md'];
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full font-medium',
      getColorClass(),
      getSizeClass()
    ]"
  >
    {{ category ? category.name : 'Uncategorized' }}
  </span>
</template>
