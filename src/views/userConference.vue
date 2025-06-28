<template>
  <div>
    <!-- 顶部搜索区域 -->
    <el-row :gutter="10" class="mb-4">
      <el-col :span="6">
        <el-input
            v-model="searchForm.keyword"
            placeholder="请输入会议名称/关键词/创建人"
            clearable
            @keyup.enter="handleSearch"
        />
      </el-col>
      <el-col :span="6">
        <el-select
            v-model="searchForm.status"
            placeholder="会议状态"
            clearable
            filterable
        >
          <el-option label="全部" value=""/>
          <el-option label="审核中" value="UNDER_CHECK"/>
          <el-option label="已通过" value="APPROVED"/>
          <el-option label="已拒绝" value="REJECTED"/>
          <el-option label="进行中" value="ONGOING"/>
          <el-option label="已完成" value="COMPLETED"/>
        </el-select>
      </el-col>
      <el-col :span="6">
        <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            clearable
        />
      </el-col>
      <el-col :span="6">
        <el-button
            type="primary"
            @click="handleSearch"
            :loading="searchLoading"
        >
          搜索
        </el-button>
        <el-button @click="resetSearch">重置</el-button>
      </el-col>
    </el-row>


    <!-- 顶部筛选按钮 -->
    <div class="mb-2">
      <el-button type="primary" @click="filterByState('UNDER_CHECK')">审核中</el-button>
      <el-button type="success" @click="filterByState('APPROVED')">已通过</el-button>
      <el-button type="warning" @click="filterByState('ONGOING')">进行中</el-button>
    </div>

    <!-- 新增按钮 -->
    <div class="mb-2">
      <el-button type="primary" @click="openDialog()">新增会议</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="conferenceList" border>
      <el-table-column prop="name" label="会议名称"/>
      <el-table-column prop="userName" label="创建人"/>
      <el-table-column prop="state" label="会议状态"/>
      <el-table-column label="会议内容">
        <template #default="{row}">
          <div class="content-cell">
            <div class="content-preview">{{ extractPureText(row.content) }}</div>
            <el-button
                type="text"
                size="small"
                @click="showContentDialog(row)"
                class="view-content-btn"
            >
              查看详情
            </el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="startTime" label="开始时间"/>
      <el-table-column label="操作" width="180">
        <template #default="scope">
          <el-button type="primary" size="small" @click="openDialog(scope.row.id)">修改</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="mt-4 text-right">
      <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="handlePageChange"
      />
    </div>

    <!-- 添加/编辑会议对话框 -->
    <add-conference-dialog
        v-model="showDialog"
        :conference-id="dialogId"
        @success="fetchConferenceList"
    />

    <!-- 会议内容详情对话框 -->
    <el-dialog
        v-model="contentDialogVisible"
        :title="`会议内容详情 - ${currentConference?.name || ''}`"
        width="70%"
        :before-close="handleContentDialogClose"
    >
      <div class="content-dialog">
        <div class="conference-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="会议名称">
              {{ currentConference?.name }}
            </el-descriptions-item>
            <el-descriptions-item label="创建人">
              {{ currentConference?.userName }}
            </el-descriptions-item>
            <el-descriptions-item label="会议状态">
              <el-tag :type="getStatusType(currentConference.state)">
                {{ currentConference?.state }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="开始时间">
              {{ currentConference?.startTime }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="content-section">
          <h3 class="content-title">会议内容</h3>
          <div class="content-body" v-html="currentConference?.content"></div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="contentDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="openDialog(currentConference?.id)">
            编辑会议
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import {defineComponent, ref, watch} from 'vue'
import AddEditConferenceDialog from '../components/AddEditConferenceDialog.vue'
import axios, {type CancelTokenSource} from "axios";
import {ElMessage, ElMessageBox} from "element-plus";
import dayjs from "dayjs";

export default defineComponent({
  name: 'ConferenceListView',
  components: {AddConferenceDialog: AddEditConferenceDialog},
  setup() {
    const showDialog = ref(false)
    const dialogId = ref<number | undefined>(undefined)

    // 内容详情对话框相关
    const contentDialogVisible = ref(false)
    const currentConference = ref<Conference | null>(null)

    // 分页相关
    const currentPage = ref(1)
    const pageSize = ref(10)
    const total = ref(0)

    const openDialog = (id?: number) => {
      console.log(id)
      dialogId.value = id
      showDialog.value = true
    }

    const searchForm = ref({
      keyword: '',
      status: '',
      dateRange: []
    })

    const filterByState = (state: keyof typeof stateMap) => {
      searchForm.value.status = state
      handleSearch()
    }

    interface Conference {
      id: number
      name: string
      userName: string
      state: keyof typeof stateMap
      start_time: string
      end_time: string
      content: string
      startTime?: string
    }

    const conferenceList = ref<Conference[]>([])

    // 显示内容详情对话框
    const showContentDialog = (conference: Conference) => {
      currentConference.value = conference
      contentDialogVisible.value = true
    }

    // 关闭内容详情对话框
    const handleContentDialogClose = (done: () => void) => {
      currentConference.value = null
      done()
    }

    // 获取状态对应的标签类型
    const getStatusType = (status: string) => {
      switch (status) {
        case '审核中':
          return 'info'
        case '已通过':
          return 'success'
        case '已拒绝':
          return 'danger'
        case '进行中':
          return 'warning'
        case '已完成':
          return ''
        default:
          return 'info'
      }
    }

    const stateMap = {
      UNDER_CHECK: '审核中',
      APPROVED: '已通过',
      REJECTED: '已拒绝',
      ONGOING: '进行中',
      COMPLETED: '已完成'
    }

    const searchLoading = ref(false)

    const resetSearch = () => {
      searchForm.value = {
        keyword: '',
        status: '',
        dateRange: []
      }
      currentPage.value = 1
      fetchConferenceList()
    }

    watch(
        () => ({
          keyword: searchForm.value.keyword,
          status: searchForm.value.status,
          dateRange: searchForm.value.dateRange
        }),
        () => {
          currentPage.value = 1
          debouncedSearch()
        },
        {deep: true}
    )

    interface SearchRequestBody {
      keyword: string | null;
      status: string | null;
      startTime: any | null;  // 你可以用更具体的类型替代 any
      endTime: any | null;    // 你可以用更具体的类型替代 any
      [key: string]: any;     // 添加索引签名
    }

    // 获取会议列表数据
    const cancelTokenSource = ref<CancelTokenSource | null>(null)

    const fetchConferenceList = async () => {
      // 取消之前的请求
      if (cancelTokenSource.value) {
        cancelTokenSource.value.cancel('Operation canceled due to new request.')
      }

      // 创建新的取消令牌
      cancelTokenSource.value = axios.CancelToken.source()

      searchLoading.value = true
      try {
        // 构建请求参数
        const requestBody: SearchRequestBody = {
          keyword: searchForm.value.keyword?.trim() || null,
          status: searchForm.value.status || null,
          startTime: searchForm.value.dateRange?.[0] || null,
          endTime: searchForm.value.dateRange?.[1] || null
        }

        // 清理空值参数
        Object.keys(requestBody).forEach(key => {
          if (requestBody[key] === undefined || requestBody[key] === '') {
            requestBody[key] = null
          }
        })

        const params = {
          page: currentPage.value,
          pageSize: pageSize.value,
        }

        const res = await axios.post('/conference/get', requestBody, {
          params,
          cancelToken: cancelTokenSource.value.token
        })

        if (res.data.code === 200) {
          conferenceList.value = (res.data.data || []).map((item: Conference) => ({
            ...item,
            state: stateMap[item.state] || item.state,
            startTime: dayjs(item.start_time).format('YYYY-MM-DD HH:mm')
          }))
          total.value = res.data.total || 0
        } else {
          ElMessage.error(res.data.message || '获取会议列表失败')
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          ElMessage.error('获取会议列表失败')
          console.error(err)
        }
      } finally {
        searchLoading.value = false
      }
    }

    const debounce = (fn: Function, delay: number) => {
      let timer: ReturnType<typeof setTimeout>
      return (...args: any[]) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
      }
    }

    const debouncedSearch = debounce(fetchConferenceList, 500)

    // 搜索
    const handleSearch = () => {
      currentPage.value = 1
      debouncedSearch()
    }

    // 分页变化
    const handlePageChange = (page: number) => {
      currentPage.value = page
      fetchConferenceList()
    }

    // 删除会议
    const handleDelete = (id?: number) => {
      ElMessageBox.confirm('确定要删除该会议吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          console.log(id)
          const res = await axios.get(`/conference/delete?id=${id}`)
          if (res.data.code === 200) {
            ElMessage.success('删除成功')
            fetchConferenceList()
          } else {
            ElMessage.error(res.data.message || '删除失败')
          }
        } catch (err) {
          ElMessage.error('删除失败')
          console.error(err)
        }
      }).catch(() => {
        // 取消删除
      })
    }

    const extractPureText = (html: string) => {
      if (!html) return '';

      try {
        // 创建临时div元素
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // 更全面的视频元素移除策略
        // 1. 移除所有video标签
        const videos = tempDiv.querySelectorAll('video');
        videos.forEach(video => video.remove());

        // 2. 移除带有视频相关data属性的元素
        const videoElements = tempDiv.querySelectorAll('[data-w-e-type="video"]');
        videoElements.forEach(element => element.remove());

        // 3. 移除其他可能的视频容器
        const videoContainers = tempDiv.querySelectorAll('.video-container, .w-e-video-container');
        videoContainers.forEach(container => container.remove());

        // 4. 移除iframe（可能包含视频）
        const iframes = tempDiv.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          // 检查iframe是否是视频相关的
          const src = iframe.src?.toLowerCase() || '';
          if (src.includes('video') || src.includes('player') || src.includes('embed')) {
            iframe.remove();
          }
        });

        // 5. 移除embed和object标签（可能包含视频）
        const embeds = tempDiv.querySelectorAll('embed, object');
        embeds.forEach(embed => embed.remove());

        // 获取纯文本
        let pureText = tempDiv.textContent || tempDiv.innerText || '';

        // 清理文本
        pureText = pureText
            .replace(/\s+/g, ' ') // 替换多个空格为单个空格
            .replace(/\n+/g, ' ') // 替换多个换行为单个空格
            .trim(); // 去除首尾空格

        // 如果文本为空或只包含空白字符，返回提示信息
        if (!pureText || pureText.length === 0) {
          return '内容为空或仅包含媒体文件';
        }

        // 限制显示长度（可选）
        const maxLength = 50; // 缩短预览长度
        if (pureText.length > maxLength) {
          return pureText.substring(0, maxLength) + '...';
        }

        return pureText;
      } catch (error) {
        console.error('提取纯文本时出错:', error);
        return '内容解析失败';
      }
    }


    // 初始化获取数据
    fetchConferenceList()

    return {
      showDialog,
      dialogId,
      openDialog,
      searchForm,
      conferenceList,
      handleSearch,
      handleDelete,
      currentPage,
      pageSize,
      total,
      handlePageChange,
      fetchConferenceList,
      extractPureText,
      // 新增的内容详情相关
      contentDialogVisible,
      currentConference,
      showContentDialog,
      handleContentDialogClose,
      getStatusType,
      filterByState,
      resetSearch,
      searchLoading
    }
  }
})
</script>

<style scoped>
.mb-2 {
  margin-bottom: 10px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.content-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-preview {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.view-content-btn {
  align-self: flex-start;
  padding: 0;
  font-size: 12px;
  color: #409eff;
}

.view-content-btn:hover {
  color: #66b1ff;
}

.content-dialog {
  max-height: 70vh;
  overflow-y: auto;
}

.conference-info {
  margin-bottom: 24px;
}

.content-section {
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}

.content-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.content-body {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 16px;
  min-height: 200px;
  line-height: 1.6;
}

.content-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.content-body :deep(video) {
  max-width: 100%;
  height: auto;
}

.content-body :deep(p) {
  margin: 8px 0;
}

.content-body :deep(h1),
.content-body :deep(h2),
.content-body :deep(h3),
.content-body :deep(h4),
.content-body :deep(h5),
.content-body :deep(h6) {
  margin: 16px 0 8px 0;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>