<template>
  <el-card shadow="hover" style="margin: 40px">
    <div>
      <el-row align="middle" justify="space-between" wrap>
        <el-col :span="12">
          <div>
            <span style="font-size: 1.1rem; font-weight: 600">{{ title }}</span>
            <el-text v-if="stats" size="small" style="margin-left: 8px" type="info">{{ stats }}</el-text>
          </div>
        </el-col>
        <el-col :span="12" style="text-align: right">
          <el-button size="small" @click="exportCSV" style="margin-right: 8px">📥 导出CSV</el-button>
          <el-input v-model="search" clearable placeholder="🔍 搜索数据..." style="max-width: 320px" />
        </el-col>
      </el-row>
      <el-table :data="sorted" :row-class-name="getRowClassName" border style="width: 100%; margin-top: 20px">
        <el-table-column v-for="(h, idx) in displayHeaders" :key="h" :label="h" :prop="h" :width="getWidth(h)" show-overflow-tooltip>
          <template #header>
            <div :draggable="!resizing" :style="dragStyle(idx, h)" @click="toggleSort(h)" @dragstart="onDragStart(h)" @drop="onDrop(h)" @dragover.prevent="onDragOver($event, idx)">
              <span>{{ h }}</span>
              <span v-if="sortKey === h" style="color: #8b5cf6; margin-left: 6px">{{ sortAsc ? '▲' : '▼' }}</span>
              <span v-else style="color: #cbd5e1; font-size: 0.7rem; opacity: 0.5; margin-left: 6px">↕</span>
            </div>
            <div
              :style="{ opacity: resizing || undefined }"
              style="
                position: absolute;
                right: 0;
                top: 0;
                width: 8px;
                height: 100%;
                cursor: col-resize;
                background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
                opacity: 0;
                transition: opacity 0.3s;
              "
              @mousedown.stop="startResize(h, $event)"
            ></div>
          </template>
          <template #default="scope">
            <span
              style="
                font-family:
                  Monaco,
                  Menlo,
                  Ubuntu Mono,
                  monospace;
                font-size: 0.85rem;
                line-height: 1.4;
                word-break: break-word;
              "
              >{{ formatCell(scope.row[h]) }}</span
            >
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="sorted.length === 0" :image-size="80" description="没有找到匹配的数据">
        <template #image><span style="font-size: 4rem; opacity: 0.5">📊</span></template>
      </el-empty>
    </div>
  </el-card>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { debounce } from '../utils/debounce';

const props = defineProps({ items: { type: Array, default: () => [] }, title: { type: String, default: 'JSON表格' } });
const emits = defineEmits(['export-csv']);

const sortKey = ref('');
const sortAsc = ref(true);
const search = ref('');

const stats = computed(() => {
  if (!props.items.length) return null;
  const total = props.items.length;
  const visible = sorted.value.length;
  if (visible === total) return `共 ${total} 条数据`;
  return `显示 ${visible} / ${total} 条数据`;
});

const headers = computed(() => {
  const first = props.items[0];
  if (!first || typeof first !== 'object') return [];
  return Object.keys(first);
});

const keyRows = computed(() => props.items.map((r, i) => ({ __key: i, ...r })));

const filtered = ref(keyRows.value);

const runFilter = debounce(() => {
  const q = search.value.trim().toLowerCase();
  const rows = keyRows.value;
  if (!q) {
    filtered.value = rows;
    return;
  }
  filtered.value = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
}, 300);

watch([search, keyRows], runFilter, { immediate: true });

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value;
  const k = sortKey.value;
  const asc = sortAsc.value;
  const arr = [...filtered.value];
  arr.sort((a, b) => {
    const va = a[k],
      vb = b[k];
    if (va == null && vb != null) return asc ? -1 : 1;
    if (va != null && vb == null) return asc ? 1 : -1;
    if (typeof va === 'number' && typeof vb === 'number') return asc ? va - vb : vb - va;
    return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
  return arr;
});

function toggleSort(h) {
  if (sortKey.value === h) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = h;
    sortAsc.value = true;
  }
}

const columnOrder = ref([]);
const displayHeaders = computed(() => (columnOrder.value.length ? columnOrder.value : headers.value));

watch(
  headers,
  (h) => {
    columnOrder.value = [...h];
  },
  { immediate: true }
);

let dragKey = null;
const dragOverIndex = ref(-1);
const dragInsertLeft = ref(true);
const resizing = ref(false);

function onDragStart(h) {
  dragKey = h;
}

function onDragOver(e, idx) {
  const w = e.currentTarget.offsetWidth;
  const x = e.offsetX;
  dragOverIndex.value = idx;
  dragInsertLeft.value = x < w / 2;
}

function onDrop(target) {
  if (!dragKey || dragKey === target) return;
  const arr = [...displayHeaders.value];
  const from = arr.indexOf(dragKey);
  const to = arr.indexOf(target);
  if (from < 0 || to < 0) return;
  let insertIndex = dragInsertLeft.value ? to : to + 1;
  if (from < insertIndex) insertIndex--;
  arr.splice(insertIndex, 0, arr.splice(from, 1)[0]);
  columnOrder.value = arr;
  dragKey = null;
  dragOverIndex.value = -1;
}

function formatCell(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function getRowClassName({ rowIndex }) {
  return rowIndex % 2 === 0 ? 'even-row' : 'odd-row';
}

const columnWidths = ref({});

function getWidth(k) {
  const v = columnWidths.value[k];
  return v ? v + 'px' : undefined;
}

let resizeKey = null;
let startX = 0;
let startW = 0;

function startResize(k, e) {
  resizeKey = k;
  resizing.value = true;
  startX = e.clientX;
  const th = e.target.closest('th');
  startW = th ? th.offsetWidth : columnWidths.value[k] || 120;
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
  if (!resizeKey) return;
  const dx = e.clientX - startX;
  const w = Math.max(80, Math.min(800, startW + dx));
  columnWidths.value = { ...columnWidths.value, [resizeKey]: w };
}

function onMouseUp() {
  resizeKey = null;
  resizing.value = false;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
});

function exportCSV() {
  if (!props.items.length) return;
  const headers = Object.keys(props.items[0] || {});
  const rows = props.items.map((r) =>
    headers.map((h) => {
      const v = r[h];
      if (v == null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    })
  );
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function dragStyle(idx, h) {
  const left = dragOverIndex.value === idx && dragInsertLeft.value;
  const right = dragOverIndex.value === idx && !dragInsertLeft.value;
  return {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    width: '100%',
    cursor: 'pointer',
    borderRadius: left ? '4px 0 0 4px' : right ? '0 4px 4px 0' : '',
    background: left ? 'rgba(34, 197, 94, 0.1)' : right ? 'rgba(34, 197, 94, 0.1)' : '',
  };
}
</script>

<style scoped>
.data-table-container {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow-light);
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.data-table-container:hover {
  box-shadow: var(--shadow-medium);
  transform: translateY(-2px);
}

.data-table-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%);
}

.card-header {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%);
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
  padding: 20px;
  margin: -20px -20px 16px -20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary, #1e293b);
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 1.2rem;
}

.table-stats {
  font-size: 0.875rem;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
}

.search-container {
  max-width: 320px;
}

:deep(.search-input .el-input__wrapper) {
  border-radius: 20px;
  border: 1px solid var(--border-color, #e2e8f0);
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
}

:deep(.search-input .el-input__wrapper:hover) {
  border-color: #8b5cf6;
}

:deep(.search-input .el-input__wrapper.is-focus) {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  background: white;
}

.search-icon {
  opacity: 0.7;
}

.table-container {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.custom-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.custom-table .el-table__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

:deep(.custom-table .el-table__header th) {
  background: transparent !important;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  padding: 16px 12px;
}

:deep(.custom-table .el-table__body td) {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.3s ease;
}

:deep(.custom-table .el-table__body tr:hover > td) {
  background: rgba(139, 92, 246, 0.05) !important;
}

:deep(.custom-table .el-table__body tr.even-row > td) {
  background: rgba(249, 250, 251, 0.3);
}

:deep(.custom-table .el-table__body tr.odd-row > td) {
  background: white;
}

.column-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 0;
  transition: all 0.3s ease;
  border-radius: 4px;
}

.column-header:hover {
  background: rgba(139, 92, 246, 0.1);
  padding: 4px 8px;
  margin: -4px -8px;
}

.header-text {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary, #1e293b);
  flex: 1;
}

.sort-icons {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.sort-icon {
  color: #8b5cf6;
  font-size: 0.8rem;
  font-weight: bold;
}

.sort-placeholder {
  color: #cbd5e1;
  font-size: 0.7rem;
  opacity: 0.5;
}

/* 列宽拖拽手柄 */

:deep(.custom-table th:hover .column-resizer) {
  opacity: 1;
}

.cell-content {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text-primary, #1e293b);
  word-break: break-word;
}

.table-footer {
  text-align: center;
  padding: 40px 20px;
  background: rgba(248, 250, 252, 0.5);
  border-radius: 8px;
  margin-top: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-header {
    padding: 16px;
    margin: -16px -16px 16px -16px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .search-container {
    max-width: 100%;
    width: 100%;
  }

  :deep(.custom-table .el-table__header th) {
    padding: 12px 8px;
  }

  :deep(.custom-table .el-table__body td) {
    padding: 10px 8px;
  }
}

@media (max-width: 480px) {
  .header-text {
    font-size: 0.8rem;
  }

  .cell-content {
    font-size: 0.8rem;
  }
}
</style>
