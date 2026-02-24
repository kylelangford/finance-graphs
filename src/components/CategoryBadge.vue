<script setup lang="ts">
import type { Category } from '../types/transaction';

const props = defineProps<{
  category?: Category;
  size?: 'sm' | 'md' | 'lg';
}>();

// Vibrant color scheme for category badges
const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-700 border border-blue-400/30',
  purple: 'bg-violet-500/15 text-violet-700 border border-violet-400/30',
  green: 'bg-emerald-500/15 text-emerald-700 border border-emerald-400/30',
  yellow: 'bg-amber-500/15 text-amber-700 border border-amber-400/30',
  pink: 'bg-pink-500/15 text-pink-700 border border-pink-400/30',
  red: 'bg-rose-500/15 text-rose-700 border border-rose-400/30',
  indigo: 'bg-indigo-500/15 text-indigo-700 border border-indigo-400/30',
  emerald: 'bg-teal-500/15 text-teal-700 border border-teal-400/30',
  gray: 'bg-slate-500/15 text-slate-700 border border-slate-400/30',
  slate: 'bg-gray-500/15 text-gray-600 border border-gray-400/30',
  orange: 'bg-orange-500/15 text-orange-700 border border-orange-400/30',
  teal: 'bg-cyan-500/15 text-cyan-700 border border-cyan-400/30',
  cyan: 'bg-sky-500/15 text-sky-700 border border-sky-400/30',
  amber: 'bg-yellow-500/15 text-yellow-700 border border-yellow-400/30',
  lime: 'bg-lime-500/15 text-lime-700 border border-lime-400/30',
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const getColorClass = () => {
  if (!props.category) {
    return 'bg-gray-100 text-gray-500 border border-gray-200';
  }
  return colorClasses[props.category.color] || 'bg-gray-100 text-gray-800 border border-gray-200';
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
