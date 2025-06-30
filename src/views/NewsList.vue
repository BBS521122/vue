<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import NewsDialog from '@/components/NewsDialog.vue'
import RecycleBin from '@/components/RecycleBin.vue'
import AuditDialog from '@/components/AuditDialog.vue'
import AuditStatusDialog from '@/components/AuditStatusDialog.vue'


const dialogKey = ref(0)
const recycleBinVisible = ref(false)
const tableRef = ref<any>(null)
const currentRowKey = ref<number | null>(null)
const role = 'ADMIN'
const auditDialogVisible = ref(false)
const auditStatusDialogVisible = ref(false)
function openAuditDialog() {
  auditDialogVisible.value = true
}
function openAuditStatusDialog() {
  auditStatusDialogVisible.value = true
}
function onAuditReloaded() {
  // 审核完后，刷新新闻列表
  loadNews()
}

watch(recycleBinVisible, (newVal, oldVal) => {
  if (!newVal && oldVal) {
    loadNews()
  }
})

function openRecycleBin() {
  recycleBinVisible.value = true
}

interface NewsItem {
  id?: number
  title: string
  imagePath: string
  sortOrder: number
  author: string
  summary: string
  content: string
  tenantId: number
  status?: string
}

const allNews = ref<NewsItem[]>([])
const currentPage = ref(1)
const pageSize = 5

const searchForm = ref({
  title: '',
  imagePath: '',
  sortOrder: '',
  author: '',
  summary: ''
})

const filteredNews = computed(() => {
  const s = searchForm.value
  return allNews.value.filter(item =>
      (!s.title || item.title.includes(s.title)) &&
      (!s.author || item.author.includes(s.author)) &&
      (!s.imagePath || (item.imagePath || '').includes(s.imagePath)) &&
      (!s.summary || item.summary.includes(s.summary)) &&
      (!s.sortOrder || item.sortOrder?.toString().includes(s.sortOrder))
  )
})

const sortedNews = computed(() => {
  return [...filteredNews.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
})

const pagedNews = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return sortedNews.value.slice(start, start + pageSize)
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref<NewsItem>({
  id: undefined,
  title: '',
  author: '',
  summary: '',
  imagePath: '',
  content: '',
  sortOrder: 0,
  tenantId: 1,
  status: '已通过'
})

// 计算最小可用排序值（无空位）
function findMinAvailableSortOrder(): number {
  const orders = allNews.value.map(item => item.sortOrder).sort((a, b) => a - b)
  let expected = 0
  for (const order of orders) {
    if (order > expected) break
    if (order === expected) expected++
  }
  return expected
}

// 计算排序最大值（用于排序输入最大限制）
const maxSortOrder = computed(() => {
  return allNews.value.length-1
})


function loadNews() {
  axios.get('http://localhost:8080/api/news').then(res => {
    allNews.value = res.data
  })
}
loadNews()

function handleSearch() {
  currentPage.value = 1
}
function handleReset() {
  searchForm.value = { title: '', imagePath: '', sortOrder: '', author: '', summary: '' }
  currentPage.value = 1
}
function handlePageChange(page: number) {
  currentPage.value = page
}

watch(dialogVisible, (val) => {
  if (!val) {
    form.value = {
      id: undefined,
      title: '',
      author: '',
      summary: '',
      imagePath: '',
      content: '',
      sortOrder: 0,
      tenantId: 1
    }
    currentRowKey.value = null
  }
})

function handleRowClick(row: NewsItem) {
  currentRowKey.value = row.id!
}

function handleSelectionChange() {
  // 复选框选择时不影响高亮行
}

function handleEdit() {
  if (!currentRowKey.value) {
    ElMessage.warning('请先点击一行进行修改')
    return
  }
  const row = pagedNews.value.find(item => item.id === currentRowKey.value)
  if (row) {
    editRow(row)
  }
}

async function handleAdd() {
  isEdit.value = false
  form.value = {
    id: undefined,
    title: '',
    author: '',
    summary: '',
    imagePath: '',
    content: '',
    sortOrder: findMinAvailableSortOrder(),
    tenantId:1
  }
  dialogKey.value++
  dialogVisible.value = true
}

async function editRow(row: NewsItem) {
  isEdit.value = true
  dialogVisible.value = false
  await nextTick()
  form.value = { ...row, imagePath: row.imagePath || '' }
  dialogVisible.value = true
}

function deleteRow(row: NewsItem) {
  ElMessageBox.confirm(`确认删除资讯：${row.title}？`, '提示')
      .then(async () => {
        const deletedSortOrder = row.sortOrder

        // 删除这条记录
        await axios.delete(`http://localhost:8080/api/news/${row.id}`)

        // 重新拉取数据
        await loadNews()

        // 获取所有排序大于它的项，统一往前移动
        const affectedItems = allNews.value
            .filter(item => item.sortOrder > deletedSortOrder)
            .sort((a, b) => a.sortOrder - b.sortOrder)

        for (const item of affectedItems) {
          await axios.put(`http://localhost:8080/api/news/${item.id}`, {
            ...item,
            sortOrder: item.sortOrder - 1
          })
        }

        ElMessage.success('删除成功')
        loadNews()
      })
      .catch(() => ElMessage.info('取消删除'))
}
async function batchDelete() {
  const selectedRows = tableRef.value.getSelectionRows()
  if (selectedRows.length === 0) {
    ElMessage.warning('请先选择要删除的新闻')
    return
  }

  ElMessageBox.confirm(`确认删除选中的 ${selectedRows.length} 条新闻？`, '提示')
      .then(async () => {
        // 获取所有 id
        const ids = selectedRows.map(row => row.id)

        // 发送批量删除请求（DELETE + 请求体）
        await axios.delete('http://localhost:8080/api/news/delete-batch', {
          data: ids
        })

        await loadNews()
        ElMessage.success('删除成功')
      })
      .catch(() => ElMessage.info('取消删除'))
}


function handleExport() {
  ElMessage.info('导出功能待实现')
}

async function handleSave(news: NewsItem) {
  try {

    if (isEdit.value) {
      await axios.put(`http://localhost:8080/api/news/${news.id}`, news)
      ElMessage.success('修改成功')
    } else {
      await axios.post(`http://localhost:8080/api/news?role=${role}`, news)
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
    loadNews()
  } catch (err: any) {
    await ElMessageBox.alert(err.response?.data?.message || err.message || '操作失败', '错误', { type: 'error' })
    dialogVisible.value = true
  }
}


function handleCancel() {
  dialogVisible.value = false
}
</script>

<template>
  <div class="p-4">
    <!-- 搜索区域 -->
    <el-form :inline="true" :model="searchForm" class="search-form" size="medium">
      <el-row :gutter="10" class="w-full items-center">
        <el-col :span="4">
          <el-form-item label="新闻标题">
            <el-input v-model="searchForm.title" placeholder="请输入新闻标题" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="新闻图片路径">
            <el-input v-model="searchForm.imagePath" placeholder="请输入图片路径" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="排序">
            <el-input v-model="searchForm.sortOrder" placeholder="请输入排序" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="作者">
            <el-input v-model="searchForm.author" placeholder="请输入作者" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="新闻简介">
            <el-input v-model="searchForm.summary" placeholder="请输入新闻简介" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="4" class="flex items-center">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button class="ml-2" @click="handleReset">重置</el-button>
        </el-col>
      </el-row>
    </el-form>

    <!-- 操作按钮 -->
    <div class="mb-4 mt-2 flex gap-3">
      <el-button type="primary" @click="handleAdd">新增</el-button>
      <el-button v-if="role === 'ADMIN'" type="success" @click="handleEdit">修改</el-button>
      <el-button v-if="role === 'ADMIN'" type="danger" @click="batchDelete">删除</el-button>
      <el-button type="warning" @click="handleExport">导出</el-button>
      <el-button type="primary" @click="openRecycleBin">查看回收站</el-button>
      <el-button
          v-if="role === 'ADMIN'"
          type="warning"
          @click="openAuditDialog"
      >
        审核新闻资讯
      </el-button>
      <el-button
          v-else
          type="info"
          @click="openAuditStatusDialog"
      >
        查看审核状态
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table
        ref="tableRef"
        :data="pagedNews"
        border
        stripe
        style="width: 100%"
        :highlight-current-row="role === 'ADMIN'"
        :current-row-key="currentRowKey"
        @row-click="role === 'ADMIN' ? handleRowClick : null"
        @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="role === 'ADMIN'" type="selection" width="55" />
      <el-table-column prop="title" label="新闻标题" />
      <el-table-column prop="author" label="作者" />
      <el-table-column prop="summary" label="新闻简介" />
      <el-table-column v-if="role === 'ADMIN'" label="操作" width="160">
        <template #default="scope">
          <el-button v-if="role === 'ADMIN'" type="text" size="small" @click.stop="editRow(scope.row)">修改</el-button>
          <el-button v-if="role === 'ADMIN'" type="text" size="small" style="color: red" @click.stop="deleteRow(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="mt-4 flex justify-end">
      <el-pagination
          background
          layout="prev, pager, next"
          :total="filteredNews.length"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="handlePageChange"
      />
    </div>
    <AuditStatusDialog
        v-model="auditStatusDialogVisible"
        :tenant-id="form.tenantId"
        @reloaded="loadNews"
    />
    <AuditDialog
        v-model="auditDialogVisible"
        @reloaded="onAuditReloaded"
    />

    <NewsDialog
        :key="dialogKey"
        v-model:visible="dialogVisible"
        :isEdit="isEdit"
        :isAdmin="role === 'ADMIN'"
        :modelValue="form"
        :maxSortOrder="maxSortOrder"
        @save="handleSave"
        @cancel="handleCancel"
    />
    <RecycleBin
        v-model="recycleBinVisible"
        :tenant-id="form.tenantId"
        :role="role"
        @reloaded="loadNews"
    />
  </div>
</template>

<style scoped>
.p-4 {
  padding: 1rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-2 {
  margin-top: 0.5rem;
}
.mt-4 {
  margin-top: 1rem;
}
.ml-2 {
  margin-left: 0.5rem;
}
.flex {
  display: flex;
}
.gap-3 {
  gap: 0.75rem;
}
.justify-end {
  justify-content: flex-end;
}
.items-center {
  align-items: center;
}
.search-form {
  margin-bottom: 1rem;
}
.w-full {
  width: 100%;
}

/* 添加高亮行样式 */
:deep(.el-table__body tr.current-row>td) {
  background-color: #f0f7ff !important;
}
</style>
