<template>
  <div class="admin-layout">
    <!-- 顶部导航栏 -->
    <el-header class="header">
      <div class="header-left">
        <el-icon class="logo-icon">
          <Menu/>
        </el-icon>
        <span class="logo-text">测盟汇</span>
        <el-breadcrumb separator="/" class="breadcrumb">
          <el-breadcrumb-item>首页</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="header-right">
        <el-icon class="header-icon">
          <Search/>
        </el-icon>
        <el-icon class="header-icon">
          <Message/>
        </el-icon>
        <el-icon class="header-icon">
          <FullScreen/>
        </el-icon>
        <el-dropdown>
          <span class="user-info">
            <el-avatar size="small" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"/>
            <span class="username">张小明</span>
            <el-icon><ArrowDown/></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/profile')">个人中心</el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 主要内容区域 -->
    <el-main class="main-content">
      <!-- 搜索筛选区域 -->
      <div class="search-section">
        <div class="search-row">
          <div class="search-item">
            <span class="search-label">子系统名称</span>
            <el-input
                v-model="searchForm.courseName"
                placeholder="请输入子系统名称"
                style="width: 200px;"
                clearable
            />
          </div>
          <div class="search-item">
            <span class="search-label">课程时间</span>
            <el-date-picker
                v-model="searchForm.courseTime"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 240px;"
            />
          </div>
          <div class="search-item">
            <span class="search-label">子系统名称</span>
            <el-select
                v-model="searchForm.courseType"
                placeholder="请选择子系统名称"
                style="width: 200px;"
                clearable
            >
              <el-option label="用户管理" value="software"/>
              <el-option label="计算机网络" value="network"/>
              <el-option label="软件系统设计" value="design"/>
              <el-option label="需求分析与设计" value="analysis"/>
            </el-select>
          </div>
          <div class="search-buttons">
            <el-button type="primary" @click="handleSearch">
              <el-icon>
                <Search/>
              </el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon>
                <Refresh/>
              </el-icon>
              重置
            </el-button>
          </div>
        </div>
        <div class="action-row">
          <el-button type="primary" @click="handleAddCourse">
            <el-icon>
              <Plus/>
            </el-icon>
            新增课程
          </el-button>
        </div>
      </div>

      <!-- 功能卡片网格 -->
      <div class="course-grid">
        <div
            v-for="course in courseList"
            :key="course.id"
            class="course-card"
            @click="handleCardClick(course.id)"
        >
          <div class="course-image">
            <img :src="course.image" :alt="course.title"/>
            <div
                class="course-tag"
                :class="{
                'tag-active': course.tag === '进行中',
                'tag-finished': course.tag === '已结束'
              }"
            >
              {{ course.tag }}
            </div>
          </div>
          <div class="course-content">
            <h3 class="course-title">{{ course.title }}</h3>
            <p class="course-description">{{ course.description }}</p>
            <div class="course-stats">
              <span class="stat-item">
                <el-icon><User/></el-icon>
                {{ course.students }}
              </span>
              <span class="stat-item">
                <el-icon><Star/></el-icon>
                {{ course.rating }}
              </span>
              <span class="stat-item">
                <el-icon><View/></el-icon>
                {{ course.views }}
              </span>
              <span class="stat-item">
                <el-icon><Clock/></el-icon>
                {{ course.duration }}
              </span>
              <span class="stat-item status">{{ course.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[12, 24, 48, 96]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, onMounted} from 'vue'
import {useRouter} from "vue-router";
import axios from "axios";
import {ElMessage} from "element-plus";

const router = useRouter()

// 点击卡片跳转到课程详情页
const handleCardClick = (courseId: number) => {
  router.push(`/system/detail/${courseId}`)
}

// 搜索表单
const searchForm = reactive({
  courseName: '',
  courseTime: '',
  courseType: ''
})

// 分页数据
const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(48)

// 课程列表数据
const courseList = ref([
  {
    id: 1,
    title: '用户管理子系统',
    description: '2023级软件系统开发实训',
    image: '/course1.jpg',
    tag: '进行中',
    students: 48,
    rating: 4.8,
    views: 290,
    duration: '2.0',
    status: '实训课程'
  },
  {
    id: 2,
    title: '组织管理子系统',
    description: '欢迎加入我们的计算机网络课程！本课程旨在为您提供计算机网络领域的全面知识，课程内容涵盖计算机网络的...',
    image: '/course2.jpg',
    tag: '进行中',
    students: 40,
    rating: 4.7,
    views: 314,
    duration: '0',
    status: '必修课'
  },
  {
    id: 3,
    title: '行业动态管理子系统',
    description: '《软件系统设计实训》是一门软件工程专业实训课，本课程旨在为学生提供和掌握软件系统分析...',
    image: '/course3.jpg',
    tag: '已结束',
    students: 32,
    rating: 4.6,
    views: 296,
    duration: '0',
    status: '实训课程'
  },
  {
    id: 4,
    title: '课程管理子系统',
    description: '《软件需求分析与设计》为全日制大学本科软件工程专业的专业课程与学位课程。《软件需求分析与设计》...',
    image: '/course4.jpg',
    tag: '已结束',
    students: 48,
    rating: 4.8,
    views: 284,
    duration: '0',
    status: '必修课'
  },
  {
    id: 5,
    title: '会议管理子系统',
    description: '《软件需求分析与设计》为全日制大学本科软件工程专业的专业课程与学位课程。《软件需求分析与设计》...',
    image: '/course4.jpg',
    tag: '已结束',
    students: 48,
    rating: 4.8,
    views: 284,
    duration: '0',
    status: '必修课'
  }
])

// 搜索处理
const handleSearch = () => {
  console.log('搜索', searchForm)
}

// 重置处理
const handleReset = () => {
  Object.assign(searchForm, {
    courseName: '',
    courseTime: '',
    courseType: ''
  })
}

// 新增课程
const handleAddCourse = () => {
  console.log('新增课程')
}

// 分页处理
const handleSizeChange = (val: number) => {
  pageSize.value = val
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

onMounted(() => {
  // 初始化数据
})

const handleLogout = async () => {
  try {
    const token = localStorage.getItem('token') // 获取当前token

    const response = await axios.post('http://localhost:8080/user/layout', null, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.status === 200) {
      localStorage.removeItem('token')
      await router.push('/login')
      ElMessage.success('登出成功')
    } else {
      ElMessage.error('登出失败')
    }
  } catch (err) {
    ElMessage.error('登出请求异常')
    console.error('登出异常:', err)
  }
}

</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-icon {
  font-size: 20px;
  color: #409eff;
}

.logo-text {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.breadcrumb {
  margin-left: 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 18px;
  color: #606266;
  cursor: pointer;
}

.header-icon:hover {
  color: #409eff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  color: #303133;
  font-size: 14px;
}

.main-content {
  padding: 20px;
}

.search-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

.search-buttons {
  display: flex;
  gap: 12px;
}

.action-row {
  display: flex;
  justify-content: flex-start;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.course-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.course-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.course-image {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.course-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.course-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.course-tag.tag-active {
  background: #67c23a;
}

.course-tag.tag-finished {
  background: #909399;
}

.course-content {
  padding: 16px;
}

.course-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.course-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
}

.stat-item.status {
  background: #f0f9ff;
  color: #409eff;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

@media (max-width: 768px) {
  .search-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-item {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .course-grid {
    grid-template-columns: 1fr;
  }
}
</style>

