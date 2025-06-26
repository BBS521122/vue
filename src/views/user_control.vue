<template>
  <el-container>
    <!-- 左侧组织架构 -->
    <el-aside width="250px" class="aside">
      <h4 style="margin-bottom: 10px;">组织架构</h4>
      <el-input placeholder="请输入部门名称" size="small" style="margin-bottom: 10px;"/>
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
          <el-input v-model="searchForm.name" placeholder="请输入用户名" clearable/>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="searchForm.phone" placeholder="请输入手机号" clearable/>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
              v-model="searchForm.state"
              placeholder="请选择状态"
              clearable style="width: 200px"
          >
            <el-option label="启用" value="正常"/>
            <el-option label="禁用" value="停用"/>
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
          <el-button type="primary" @click="handleSearch" :loading="loading">搜索</el-button>
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
        <el-button type="primary" @click="downloadTemplate">下载导入模板</el-button>
      </div>

      <!-- 用户表格 -->
      <el-table :data="userList" border style="width: 100%;" v-loading="loading">
        <el-table-column type="selection" width="55"/>
        <el-table-column prop="id" label="用户编号" width="80"/>
        <el-table-column prop="name" label="用户名"/>
        <el-table-column prop="nickname" label="用户昵称"/>
        <el-table-column prop="department" label="部门"/>
        <el-table-column prop="phone" label="手机号"/>
        <el-table-column label="状态">
          <template #default="{ row }">
            <el-switch
                v-model="row.state"
                @change="handleStateChange(row)"
                :loading="row.stateLoading"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间"/>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <template v-if="row.role !== 'ADMIN'">
              <div style="display: flex; gap: 2px;">
                <el-button type="text" size="small" @click="handleEdit(row)">修改</el-button>
                <el-button type="danger" size="small" text @click="handleDelete(row)">删除</el-button>
                <el-button type="text" size="small">更多</el-button>
              </div>
            </template>
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
  <AddUserDialog ref="addDialogRef" @success="handleAddSuccess"/>
  <EditUserDialog ref="editDialogRef" @success="handleEditSuccess"/>
</template>

<script setup>
import {ref, onMounted, watch} from 'vue'
import AddUserDialog from './AddUserDialog.vue'
import EditUserDialog from './EditUserDialog.vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import * as XLSX from 'xlsx'
import axios from 'axios'

// 防抖函数
const debounce = (fn, delay) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 加载状态
const loading = ref(false)

// 查询条件
const searchForm = ref({
  name: '',
  phone: '',
  state: '',
  dates: []
})

// 用户数据
const userList = ref([])
const total = ref(0)
const pageSize = ref(10)
const currentPage = ref(1)

// 取消令牌
let cancelTokenSource = null

// 获取用户列表
const getUserList = async () => {
  // 取消之前的请求
  if (cancelTokenSource) {
    cancelTokenSource.cancel('Operation canceled due to new request.')
  }

  // 创建新的取消令牌
  cancelTokenSource = axios.CancelToken.source()

  loading.value = true
  try {
    // 如果选择了日期范围但未完整，则不发送请求
    if (searchForm.value.dates && searchForm.value.dates.length === 1) {
      return
    }

    // 构建请求体数据
    const requestBody = {
      name: searchForm.value.name || undefined,
      phone: searchForm.value.phone || undefined,
      state: searchForm.value.state || undefined,
      startDate: searchForm.value.dates?.[0] || undefined,
      endDate: searchForm.value.dates?.[1] || undefined
    }

    // 过滤空值参数
    Object.keys(requestBody).forEach(key => {
      if (requestBody[key] === undefined || requestBody[key] === '') {
        requestBody[key] = null
      }
    })

    // 分页参数通过URL参数传递
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value
    }

    const response = await axios.post('http://localhost:8080/admin/get-user', requestBody, {
      params,
      cancelToken: cancelTokenSource.token
    })

    if (response.data.code === 200) {
      const pageInfo = response.data.data
      userList.value = (pageInfo.list || []).map(user => ({
        ...user,
        stateLoading: false // 为每个用户添加状态切换加载状态
      }))
      total.value = pageInfo.total || 0
    } else {
      console.error('获取用户列表失败：', response)
      ElMessage.error(response.data.message || '获取用户列表失败')
    }
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.error('获取用户列表失败：', error)
      ElMessage.error('获取用户列表失败，请检查网络连接')
    }
  } finally {
    loading.value = false
  }
}

// 创建防抖搜索函数
const debouncedSearch = debounce(() => {
  getUserList()
}, 500)

// 监控搜索条件变化
watch(
    () => ({...searchForm.value}),
    () => {
      currentPage.value = 1
      debouncedSearch()
    },
    {deep: true}
)

// 搜索按钮点击
const handleSearch = () => {
  currentPage.value = 1
  getUserList()
}

// 重置
const resetForm = () => {
  searchForm.value = {
    name: '',
    phone: '',
    state: '',
    dates: []
  }
  currentPage.value = 1
  getUserList()
}

// 分页相关
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  getUserList()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  getUserList()
}

// 添加用户
const addDialogRef = ref()
const showAddUser = () => {
  addDialogRef.value.open()
}

// 添加成功回调
const handleAddSuccess = () => {
  // 刷新用户列表
  getUserList()
}

// 编辑用户
const editDialogRef = ref()
const handleEdit = (user) => {
  editDialogRef.value.open(user)
}

// 编辑成功回调
const handleEditSuccess = () => {
  // 刷新用户列表
  getUserList()
}

// 状态切换
const handleStateChange = async (row) => {
  row.stateLoading = true
  try {
    const response = await axios.post(`http://localhost:8080/admin/update-user-state`, {
      id: row.id,
      state: row.state ? 1 : 0
    })

    if (response.data.code === 200) {
      ElMessage.success(`用户状态已${row.state ? '启用' : '禁用'}`)
    } else {
      // 如果后端返回失败，恢复原来的状态
      row.state = !row.state
      ElMessage.error(response.data.message || '状态更新失败')
    }
  } catch (error) {
    // 如果请求失败，恢复原来的状态
    row.state = !row.state
    ElMessage.error('状态更新失败，请重试')
    console.error('状态更新失败：', error)
  } finally {
    row.stateLoading = false
  }
}

// 删除用户
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
        `确定要删除用户 "${row.name}" 吗？此操作不可恢复。`,
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
    )

    const response = await axios.get(`http://localhost:8080/admin/delete-user?id=${row.id}`)

    if (response.data.code === 200) {
      ElMessage.success('删除成功')
      // 如果当前页只有一条数据且不是第一页，则跳转到上一页
      if (userList.value.length === 1 && currentPage.value > 1) {
        currentPage.value -= 1
      }
      getUserList()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败，请重试')
      console.error('删除用户失败：', error)
    }
  }
}

// 组件挂载时获取数据
onMounted(() => {
  getUserList()
})

// 组织架构树
const organizationData = [
  {
    label: '测盟汇',
    children: [
      {
        label: '深圳总公司',
        children: [
          {label: '研发部门'},
          {label: '市场部门'},
          {label: '测试部门'},
          {label: '财务部门'},
          {label: '运维部门'}
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

      const formattedData = jsonData.map(item => ({
        name: item['名字']?.trim(),
        gender: item['性别']?.trim(),
        password: item['密码']?.trim(),
        state: item['状态']?.trim(),
        department: item['部门']?.trim(),
        email: item['邮箱']?.trim(),
        phone: item['电话']?.trim(),
        role: item['角色']?.toLowerCase(),
        post: item['岗位']?.trim(),
        nickname: item['昵称']?.trim()
      }))

      // 调用后端导入接口
      try {
        const response = await axios.post('http://localhost:8080/admin/import-user', formattedData)
        if (response.data.code === 200) {
          ElMessage.success('导入成功！')
          getUserList() // 重新获取用户列表
        } else {
          ElMessage.error(response.data.message || '导入失败')
        }
      } catch (error) {
        ElMessage.error('导入失败，请检查数据格式')
        console.error('导入失败：', error)
      }
    }
    reader.readAsBinaryString(file)
  } catch (err) {
    ElMessage.error('文件读取失败')
    console.error(err)
  }
}

// 导出逻辑
const handleExport = () => {
  const exportData = userList.value.map(user => ({
    用户编号: user.id,
    用户名: user.name,
    昵称: user.nickname,
    性别: user.gender,
    部门: user.department,
    手机号: user.phone,
    邮箱: user.email,
    角色: user.role,
    状态: user.state ? '启用' : '禁用',
    创建时间: user.createTime
  }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表')
  XLSX.writeFile(workbook, '用户列表.xlsx')
}

// 模板下载
const downloadTemplate = () => {
  // 定义模板表头
  const headers = [
    '名字', '性别', '密码', '状态',
    '部门', '邮箱', '电话', '角色',
    '岗位', '昵称'
  ]

  // 创建示例数据
  const demoData = [{
    名字: '张三',
    性别: '男',
    密码: '123456',
    状态: '正常',
    部门: '技术部',
    邮箱: 'zhangsan@example.com',
    电话: '13800138000',
    角色: 'user',
    岗位: '工程师',
    昵称: '小张'
  }]

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(demoData, {header: headers})

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '用户数据模板')

  // 生成文件并下载
  XLSX.writeFile(wb, '用户导入模板.xlsx')
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