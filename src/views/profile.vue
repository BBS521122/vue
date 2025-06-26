<template>
  <div class="profile-container">
    <div class="profile-header">
      <h2>基本资料</h2>
    </div>

    <div class="profile-content">
      <div class="profile-section">
        <div class="section-title">基本资料</div>
        <div class="section-content">
          <div class="info-row">
            <div class="info-label">用户昵称</div>
            <div class="info-value">{{ userInfo.nickname || '--' }}</div>
          </div>
          <div class="info-row">
            <div class="info-label">手机号码</div>
            <div class="info-value">{{ userInfo.phone || '--' }}</div>
          </div>
          <div class="info-row">
            <div class="info-label">邮箱</div>
            <div class="info-value">{{ userInfo.email || '--' }}</div>
          </div>
          <div class="info-row">
            <div class="info-label">性别</div>
            <div class="info-value">
              <el-radio-group v-model="userInfo.gender" @change="handleUpdateInfo">
                <el-radio label="男" size="large">男</el-radio>
                <el-radio label="女" size="large">女</el-radio>
              </el-radio-group>
            </div>
          </div>
        </div>
      </div>


      <div class="profile-section">
        <div class="section-title">修改密码</div>
        <div class="section-content">
          <el-form
              :model="passwordForm"
              label-width="120px"
              style="max-width: 500px"
              :rules="passwordRules"
              ref="passwordFormRef"
          >
            <el-form-item label="当前密码" prop="currentPassword">
              <el-input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  show-password
                  placeholder="请输入当前密码"
              />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  show-password
                  placeholder="请输入新密码"
              />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  show-password
                  placeholder="请再次输入新密码"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                  type="primary"
                  @click="handleChangePassword"
                  :loading="passwordLoading"
              >
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="profile-section">
        <div class="section-title">头像设置</div>
        <div class="section-content">
          <div class="avatar-uploader">
            <el-upload
                class="avatar-upload"
                action="#"
                :show-file-list="false"
                :http-request="handleAvatarUpload"
                :before-upload="beforeAvatarUpload"
                :disabled="avatarLoading"
            >
              <template v-if="avatarLoading">
                <el-icon class="is-loading" style="font-size: 28px">
                  <Loading/>
                </el-icon>
              </template>
              <template v-else>
                <img v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar"/>
                <el-icon v-else class="avatar-uploader-icon">
                  <Plus/>
                </el-icon>
              </template>
              <div class="upload-tips">点击上传头像</div>
            </el-upload>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, reactive} from 'vue'
import {ElMessage, ElRadioGroup, ElRadio, ElForm, ElFormItem, ElInput, ElButton, ElUpload} from 'element-plus'
import {Plus, Loading} from '@element-plus/icons-vue'
import type {FormInstance, FormRules} from 'element-plus'

// 用户信息
const userInfo = reactive<UserInfo & { avatar: string }>({
  nickname: '',
  phone: '',
  email: '',
  gender: '男',
  avatar: ''
});

// 密码表单
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 表单验证规则
const passwordRules: FormRules = {
  currentPassword: [
    {required: true, message: '请输入当前密码', trigger: 'blur'},
    {min: 6, max: 20, message: '密码长度在6到20个字符', trigger: 'blur'}
  ],
  newPassword: [
    {required: true, message: '请输入新密码', trigger: 'blur'},
    {min: 6, max: 20, message: '密码长度在6到20个字符', trigger: 'blur'}
  ],
  confirmPassword: [
    {required: true, message: '请确认新密码', trigger: 'blur'},
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 表单引用
const passwordFormRef = ref<FormInstance>()

// 加载状态
const passwordLoading = ref(false)
const avatarLoading = ref(false)

// 加载用户信息
const loadUserInfo = async () => {
  try {
    axios.get('http://localhost:8080/user/get')
        .then(response => {
          if (response.data.code == 200 && response.data.data) {
            console.log(response.data)
            Object.assign(userInfo, response.data.data)
          } else {
            ElMessage.error('获取用户信息失败')
          }
        }).catch(error => {
      console.error('获取用户信息失败:', error)
      ElMessage.error('获取用户信息失败')
    })

    axios.get('http://localhost:8080/user/get-avatar')
        .then(response => {
          if (response.data.code == 200 && response.data.data) {
            console.log(response.data)
            userInfo.avatar = response.data.data
          } else {
            ElMessage.error('暂无头像，以默认头像代替')
            userInfo.avatar = "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
          }
        }).catch(error => {
      console.error('暂无头像:', error)
      ElMessage.error('暂无头像，以默认头像代替')
      userInfo.avatar = "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
    })
  } catch (error) {
    ElMessage.error('获取用户信息失败')
  }
}

// 更新用户信息
const handleUpdateInfo = async () => {
  try {
    // await updateUserInfo({
    //   gender: userInfo.value.gender,
    //   nickname: userInfo.value.nickname
    // })
    ElMessage.success('信息更新成功')
  } catch (error) {
    ElMessage.error('信息更新失败')
  }
}

// 修改密码
const handleChangePassword = async () => {
  try {
    await passwordFormRef.value?.validate()

    passwordLoading.value = true

    await axios.post(`http://localhost:8080/user/update-password`, {
      oldPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    })
        .then(response => {
          if (response.data.code == 200) {
            console.log(response.data)
            ElMessage.success('密码修改成功')
          } else if (response.data.code == 400) {
            console.log(response.data)
            ElMessage.error('旧密码错误')
          } else {
            ElMessage.error('密码修改失败')
          }
        }).catch(error => {
          console.error('密码修改失败:', error)
          ElMessage.error('密码修改失败')
        })
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message || '密码修改失败')
    }
  } finally {
    passwordLoading.value = false
  }
}

// 头像上传
const handleAvatarUpload = async (options: any) => {
  try {
    avatarLoading.value = true
    const formData = new FormData();
    formData.append('file', options.file);
    const response = await axios.post('http://localhost:8080/user/update_avatar', formData);
    if (response.data.code == 200) {
      userInfo.avatar = response.data.url + '?t=' + Date.now();
      console.log(response.data)
      ElMessage.success('头像上传成功！');
    } else {
      ElMessage.error('头像上传失败！');
    }
  } catch (error) {
    ElMessage.error('头像上传失败')
  } finally {
    avatarLoading.value = false
  }
}

const beforeAvatarUpload = (file: any) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('上传头像图片只能是 JPG/PNG 格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('上传头像图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 组件挂载时加载用户信息
onMounted(() => {
  loadUserInfo()
})

import axios from 'axios';
import type {AxiosResponse} from 'axios';

// 用户信息类型
export interface UserInfo {
  nickname: string;
  phone: string;
  email: string;
  gender: string;
}


// 密码表单类型
export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// // 更新用户信息
// export const updateUserInfo = async (data: {
//   gender: string;
//   nickname: string
// }): Promise<AxiosResponse<void>> => {
//   return axios.post('http://localhost:8080/user/get', data);
// };
//
//
// // 更新密码
// export const updatePassword = async (data: {
//   currentPassword: string;
//   newPassword: string
// }): Promise<AxiosResponse<void>> => {
//   return axios.post('http://localhost:8080/user/get', data);
// };
//
// // 上传头像
// export const uploadAvatar = async (file: File): Promise<AxiosResponse<{ avatarUrl: string }>> => {
//   const formData = new FormData();
//   formData.append('avatar', file);
//   return axios.post('http://localhost:8080/user/get', formData, {
//     headers: {
//       'Content-Type': 'multipart/form-data'
//     }
//   });
// };
</script>

<style scoped>
.profile-container {
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
  padding: 20px;
}

.profile-header {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.profile-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.profile-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.profile-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.profile-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.info-label {
  width: 120px;
  color: #606266;
}

.info-value {
  flex: 1;
  color: #303133;
}

.avatar-uploader {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 120px;
  height: 120px;
  line-height: 120px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 50%;
  margin-bottom: 10px;
}

.upload-tips {
  color: #909399;
  font-size: 14px;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>