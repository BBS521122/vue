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
        <div class="action-row">
          <el-button type="primary" @click="handleAddCourse">
            <el-icon>
              <Plus/>
            </el-icon>
            新增课程
          </el-button>
        </div>
      </div>

      <!-- 圆形卡片容器 -->
      <div class="circle-container">
        <div
            v-for="(course, index) in courseList"
            :key="course.id"
            class="circle-card"
            :style="getCardPosition(index)"
            @click="handleCardClick(course.id)"
        >
          <div class="card-content">
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
            <div class="course-info">
              <h3 class="course-title">{{ course.title }}</h3>
              <div class="course-stats">
                <span class="stat-item">
                  <el-icon><User/></el-icon>
                  {{ course.students }}
                </span>
                <span class="stat-item">
                  <el-icon><Star/></el-icon>
                  {{ course.rating }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 控制按钮和分页 -->
      <div class="bottom-controls">
        <div class="circle-controls">
          <el-button @click="rotateLeft" circle>
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-button @click="rotateRight" circle>
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
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
      </div>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from "vue-router";
import axios from "axios";
import { ElMessage } from "element-plus";
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const router = useRouter()

// 旋转角度
const rotationAngle = ref(0)

// 计算卡片位置
const getCardPosition = (index: number) => {
  const radius = window.innerWidth < 768 ? 180 : 280 // 响应式半径
  const angle = (index * (360 / courseList.value.length) + rotationAngle.value)
  const radian = angle * Math.PI / 180
  const x = radius * Math.cos(radian)
  const y = radius * Math.sin(radian)

  // 根据位置计算缩放比例（前面的卡片大，后面的小）
  const scale = 0.7 + 0.3 * (y + radius) / (2 * radius)

  return {
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
    zIndex: Math.round(y + radius), // 根据Y轴位置设置z-index
    opacity: scale // 透明度也随缩放变化
  }
}

// 旋转控制
const rotateLeft = () => {
  rotationAngle.value += 360 / courseList.value.length
}

const rotateRight = () => {
  rotationAngle.value -= 360 / courseList.value.length
}

// 点击卡片跳转到课程详情页
const handleCardClick = (courseId: number) => {
  router.push(`/system/detail/${courseId}`)
}

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
    image: 'https://via.placeholder.com/300x200?text=Course1',
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
    description: '欢迎加入我们的计算机网络课程！本课程旨在为您提供计算机网络领域的全面知识',
    image: 'https://via.placeholder.com/300x200?text=Course2',
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
    description: '《软件系统设计实训》是一门软件工程专业实训课',
    image: 'https://via.placeholder.com/300x200?text=Course3',
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
    description: '《软件需求分析与设计》为全日制大学本科软件工程专业的专业课程',
    image: 'https://via.placeholder.com/300x200?text=Course4',
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
    description: '会议管理子系统描述信息',
    image: 'https://via.placeholder.com/300x200?text=Course5',
    tag: '已结束',
    students: 48,
    rating: 4.8,
    views: 284,
    duration: '0',
    status: '必修课'
  },
  {
    id: 6,
    title: '租户管理子系统',
    description: '租户管理子系统描述信息',
    image: 'https://via.placeholder.com/300x200?text=Course6',
    tag: '进行中',
    students: 36,
    rating: 4.5,
    views: 210,
    duration: '1.5',
    status: '选修课'
  }
])

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

const handleLogout = async () => {
  try {
    const token = localStorage.getItem('token')
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

.action-row {
  display: flex;
  justify-content: flex-start;
}

/* 圆形布局样式 */
.circle-container {
  position: relative;
  width: 100%;
  height: 600px;
  margin: 40px auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.circle-card {
  position: absolute;
  width: 200px;
  height: 260px;
  left: 50%;
  top: 50%;
  margin-left: -100px;
  margin-top: -130px;
  transition: all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  transform-origin: center;
  cursor: pointer;
}

.card-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  overflow: hidden;
}

.card-content:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.course-image {
  position: relative;
  height: 140px;
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 12px;
}

.course-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.card-content:hover .course-image img {
  transform: scale(1.1);
}

.course-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.course-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 8px 0;
  line-height: 1.4;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-stats {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 底部控制区域 */
.bottom-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40px;
}

.circle-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.pagination-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* 标签样式 */
.course-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  z-index: 2;
}

.course-tag.tag-active {
  background: #67c23a;
}

.course-tag.tag-finished {
  background: #909399;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .circle-container {
    height: 400px;
  }

  .circle-card {
    width: 150px;
    height: 200px;
    margin-left: -75px;
    margin-top: -100px;
  }

  .course-image {
    height: 100px;
  }

  .course-title {
    font-size: 14px;
  }
}
</style>