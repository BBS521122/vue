<template>
  <el-container>
    <!-- 左侧组织架构 -->
    <el-aside width="250px" class="aside">
      <h4 style="margin-bottom: 10px;">组织架构</h4>
      <el-input placeholder="请输入部门名称" size="small" style="margin-bottom: 10px;" />
      <el-tree
          :data="organizationData"
          :props="defaultProps"
          accordion
          node-key="id"
          highlight-current
          style="max-height: calc(100vh - 160px); overflow-y: auto;"
      />
    </el-aside>

    <!-- 右侧主内容 -->
    <el-main class="main">
      <!-- 查询区域 -->
      <el-form :inline="true" :model="searchForm" class="search-form" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="searchForm.phone" placeholder="请输入手机号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="启用" value="1" />
            <el-option label="禁用" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
              v-model="searchForm.dates"
              type="daterange"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 操作按钮组 -->
      <div class="button-group">
        <el-button type="primary" @click="showAddUser">新增</el-button>
        <el-upload
            class="upload-demo"
            action=""
            :before-upload="beforeUpload"
            :http-request="customUpload"
            accept=".xlsx,.xls,.csv"
            :show-file-list="false"
        >
          <el-button type="info">导入</el-button>
        </el-upload>
        <el-button type="warning" @click="handleExport">导出</el-button>
      </div>

      <!-- 用户表格 -->
      <el-table :data="userList" border style="width: 100%;">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="用户编号" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="nickname" label="用户昵称" />
        <el-table-column prop="department" label="部门" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column label="状态">
          <template #default="{ row }">
            <el-switch v-model="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="handleEdit(row)">修改</el-button>
            <el-button type="danger" size="small" text>删除</el-button>
            <el-button type="text" size="small">更多</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div style="text-align: right; margin-top: 20px;">
        <el-pagination
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            :page-sizes="[10, 20, 50]"
            :page-size="pageSize"
            :current-page="currentPage"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-main>
  </el-container>

  <!-- Dialog 组件 -->
  <AddUserDialog ref="addDialogRef" />
  <EditUserDialog ref="editDialogRef" />
</template>

<script setup>
import { ref } from 'vue'
import AddUserDialog from './AddUserDialog.vue'
import EditUserDialog from './EditUserDialog.vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'

// 查询条件
const searchForm = ref({
  username: '',
  phone: '',
  status: '',
  dates: []
})

// 用户数据
const userList = ref([
  {
    id: 1,
    username: 'admin',
    nickname: '若依',
    department: '研发部门',
    phone: '15888888888',
    status: true,
    createTime: '2021-09-21 17:00:35'
  },
  {
    id: 2,
    username: 'ry',
    nickname: '若依',
    department: '测试部门',
    phone: '15666666666',
    status: false,
    createTime: '2021-09-21 17:00:35'
  }
])

const total = ref(2)
const pageSize = ref(10)
const currentPage = ref(1)

const handleSearch = () => {
  console.log('搜索参数：', searchForm.value)
}

const resetForm = () => {
  searchForm.value = {
    username: '',
    phone: '',
    status: '',
    dates: []
  }
}

const handleSizeChange = (size) => {
  pageSize.value = size
}

const handleCurrentChange = (page) => {
  currentPage.value = page
}

// 添加用户
const addDialogRef = ref()
const showAddUser = () => {
  addDialogRef.value.open()
}

// 编辑用户
const editDialogRef = ref()
const handleEdit = (user) => {
  editDialogRef.value.open(user)
}

// 组织架构树
const organizationData = [
  {
    label: '测盟汇',
    children: [
      {
        label: '深圳总公司',
        children: [
          { label: '研发部门' },
          { label: '市场部门' },
          { label: '测试部门' },
          { label: '财务部门' },
          { label: '运维部门' }
        ]
      },
      {
        label: '长沙分公司',
        children: [
          {label: '市场部门'},
          {label: '财务部门'}
        ]
      }
    ]
  }
]
const defaultProps = {
  children: 'children',
  label: 'label'
}

// 导入逻辑
const beforeUpload = (file) => {
  const isExcel = file.type.includes('spreadsheet') || file.name.endsWith('.csv')
  if (!isExcel) {
    ElMessage.error('只能上传 .xlsx/.xls/.csv 格式文件')
  }
  return isExcel
}

const customUpload = async ({file}) => {
  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const data = e.target.result
      const workbook = XLSX.read(data, {type: 'binary'})
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      console.log('导入数据：', jsonData)

      // TODO: 后端接口
      // const res = await axios.post('/api/user/import', jsonData)
      ElMessage.success('模拟导入成功！')
    }
    reader.readAsBinaryString(file)
  } catch (err) {
    ElMessage.error('导入失败')
    console.error(err)
  }
}

// 导出逻辑
const handleExport = () => {
  const exportData = userList.value.map(user => ({
    用户编号: user.id,
    用户名: user.username,
    昵称: user.nickname,
    部门: user.department,
    手机号: user.phone,
    状态: user.status ? '启用' : '禁用',
    创建时间: user.createTime
  }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表')
  XLSX.writeFile(workbook, '用户列表.xlsx')
}
</script>

<style scoped>
.el-container {
  height: 100vh;
  background-color: #f2f3f5;
}

.aside {
  background: #fafafa;
  padding: 20px;
  border-right: 1px solid #eee;
}

.main {
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  min-height: 100%;
}

.search-form {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px 30px;
  align-items: flex-start;
}

.button-group {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
}
</style>
