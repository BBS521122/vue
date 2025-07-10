<template>
  <div class="register-container">
    <div class="register-box">
      <div class="logo-area">
        <img src="@/assets/logo.jpg" alt="测盟汇管理系统" class="logo">
        <h1 class="system-name">测盟汇管理系统</h1>
      </div>

      <el-form
          ref="registerForm"
          :model="registerForm"
          :rules="registerRules"
          class="register-form"
      >
        <el-form-item prop="username">
          <el-input
              v-model="registerForm.username"
              placeholder="请输入用户名"
              prefix-icon="User"
              clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
              v-model="registerForm.password"
              placeholder="请输入密码"
              prefix-icon="Lock"
              show-password
              clearable
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
              v-model="registerForm.confirmPassword"
              placeholder="请确认密码"
              prefix-icon="Lock"
              show-password
              clearable
          />
        </el-form-item>

        <el-form-item prop="email">
          <el-input
              v-model="registerForm.email"
              placeholder="请输入邮箱"
              prefix-icon="Message"
              clearable
          />
        </el-form-item>

        <el-form-item prop="phone">
          <el-input
              v-model="registerForm.phone"
              placeholder="请输入手机号"
              prefix-icon="Phone"
              clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button
              type="primary"
              class="register-btn"
              :loading="loading"
              @click="handleRegister"
          >
            注 册
          </el-button>
        </el-form-item>

        <div class="login-link">
          已有账号？<el-link type="primary" @click="goToLogin">立即登录</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

export default {
  setup() {
    const router = useRouter()
    const registerForm = reactive({
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
      phone: ''
    })

    const validatePassword = (rule, value, callback) => {
      if (value !== registerForm.password) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }

    const registerRules = reactive({
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 20, message: '长度在3到20个字符', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 20, message: '长度在6到20个字符', trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, message: '请再次输入密码', trigger: 'blur' },
        { validator: validatePassword, trigger: 'blur' }
      ],
      email: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
      ],
      phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
      ]
    })

    const loading = ref(false)

    const handleRegister = () => {
      registerFormRef.value.validate(valid => {
        if (valid) {
          loading.value = true
          // 这里执行注册API调用
          console.log('注册信息:', registerForm)
          setTimeout(() => {
            loading.value = false
            ElMessage.success('注册成功')
            router.push('/login')
          }, 1000)
        }
      })
    }

    const goToLogin = () => {
      router.push('/login')
    }

    return {
      registerForm,
      registerRules,
      loading,
      handleRegister,
      goToLogin
    }
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: url('@/assets/背景.jpg') no-repeat center center;
  background-size: cover;
  position: relative;
}

.register-box {
  width: 420px;
  padding: 40px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.register-btn {
  width: 100%;
  height: 45px;
  font-size: 16px;
  letter-spacing: 2px;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #606266;
  font-size: 14px;
}

/* 复用登录页的部分样式 */
.logo-area, .system-name, .logo {
  /* 保持与登录页一致 */
}
</style>