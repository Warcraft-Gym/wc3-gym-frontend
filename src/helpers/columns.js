import { computed, unref } from 'vue';
import { useDisplay } from 'vuetify';

// Columns marked `mobile: false` are dropped below the md breakpoint
export function useColumns(headers) {
  const { mdAndUp } = useDisplay();
  return computed(() => unref(headers).filter((h) => mdAndUp.value || h.mobile !== false));
}
