<template>
  <el-container>
    <!-- 左侧组织架构 -->
    <el-aside width="250px">
      <el-input placeholder="请输入部门名称" size="small" />
      <el-tree
          :data="organizationData"
          :props="defaultProps"
          accordion
          node-key="id"
          highlight-current
      />
    </el-aside>

    <!-- 右侧内容区域 -->
    <el-main>
      <!-- 查询条件区域 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="searchForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="用户状态">
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
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 操作按钮组 -->
      <div style="margin: 10px 0;">
        <el-button type="primary">新增</el-button>
        <el-button type="success">修改</el-button>
        <el-button type="danger">删除</el-button>
        <el-button type="info">导入</el-button>
        <el-button type="warning">导出</el-button>
      </div>

      <!-- 用户列表 -->
      <el-table :data="userList" style="width: 100%" border>
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="用户编号" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="nickname" label="用户昵称" />
        <el-table-column prop="department" label="部门" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column label="状态">
          <template #default="scope">
            <el-switch v-model="scope.row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" />
        <el-table-column label="操作">
          <template #default="scope">
            <el-button type="text" size="small">修改</el-button>
            <el-button type="danger" size="small" text>删除</el-button>
            <el-button type="text" size="small">更多</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div style="text-align: right; margin-top: 10px;">
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
</template>

<script setup>
import { ref } from 'vue'

// 查询表单数据
const searchForm = ref({
  username: '',
  phone: '',
  status: '',
  dates: []
})

// 用户列表数据
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
    status: true,
    createTime: '2021-09-21 17:00:35'
  }
])

const total = ref(2)
const pageSize = ref(10)
const currentPage = ref(1)

const handleSearch = () => {
  console.log('搜索', searchForm.value)
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

// 组织架构
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
          { label: '市场部门' },
          { label: '财务部门' }
        ]
      }
    ]
  }
]
const defaultProps = {
  children: 'children',
  label: 'label'
}
</script>

<style scoped>
.search-form {
  margin-bottom: 15px;
}
</style>
