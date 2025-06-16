<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo-area">
        <img src="@/assets/logo.svg" alt="测盟汇管理系统" class="logo">
        <h1 class="system-name">测盟汇管理系统</h1>
      </div>

      <el-form
          ref="loginForm"
          :model="loginForm"
          :rules="loginRules"
          class="login-form"
          @keyup.enter.native="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              prefix-icon="User"
              clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
              v-model="loginForm.password"
              placeholder="请输入密码"
              prefix-icon="Lock"
              show-password
              clearable
          />
        </el-form-item>

        <el-form-item prop="captcha" v-if="showCaptcha">
          <div class="captcha-container">
            <el-input
                v-model="loginForm.captcha"
                placeholder="请输入验证码"
                prefix-icon="Key"
                class="captcha-input"
                clearable
            />
            <div class="captcha-image-wrapper" @click="refreshCaptcha">
              <canvas ref="captchaCanvas" class="captcha-canvas" width="120" height="40"></canvas>
              <div class="captcha-refresh">
                <el-icon :size="16">
                  <RefreshRight/>
                </el-icon>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item>
          <div class="remember-forget-container">
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
            <el-link type="primary" class="forget-pwd" :underline="false">忘记密码?</el-link>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
              type="primary"
              class="login-btn"
              :loading="loading"
              @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>

        <div class="register-link">
          还没有账号？<el-link type="primary" @click="goToRegister">立即注册</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script>
import {ref, reactive, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {ElMessage} from 'element-plus'
import {RefreshRight, User, Lock, Key} from '@element-plus/icons-vue'

export default {
  components: {
    RefreshRight
  },
  setup() {
    const router = useRouter()
    const loginFormRef = ref(null)

    // 表单数据
    const loginForm = reactive({
      username: '',
      password: '',
      captcha: ''
    })

    // 表单验证规则
    const loginRules = reactive({
      username: [
        {required: true, message: '请输入用户名', trigger: 'blur'},
        {min: 3, max: 20, message: '长度在3到20个字符', trigger: 'blur'}
      ],
      password: [
        {required: true, message: '请输入密码', trigger: 'blur'},
        {min: 6, max: 20, message: '长度在6到20个字符', trigger: 'blur'}
      ],
      captcha: [
        {required: true, message: '请输入验证码', trigger: 'blur'},
        {
          validator: (rule, value, callback) => {
            if (showCaptcha.value && value.toLowerCase() !== captchaText.value.toLowerCase()) {
              callback(new Error('验证码错误'))
            } else {
              callback()
            }
          },
          trigger: 'blur'
        }
      ]
    })

    // 其他状态
    const loading = ref(false)
    const rememberMe = ref(false)
    const showCaptcha = ref(true)
    const captchaCanvas = ref(null)
    const captchaText = ref('')

// 生成随机验证码文本
    const generateCaptchaText = () => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let result = ''
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      captchaText.value = result
      return result
    }

    // 绘制验证码
    const drawCaptcha = () => {
      const ctx = captchaCanvas.value.getContext('2d')
      const text = generateCaptchaText()

      // 清空画布
      ctx.clearRect(0, 0, captchaCanvas.value.width, captchaCanvas.value.height)

      // 设置背景色
      ctx.fillStyle = '#f5f7fa'
      ctx.fillRect(0, 0, captchaCanvas.value.width, captchaCanvas.value.height)

      // 绘制干扰线
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = getRandomColor()
        ctx.beginPath()
        ctx.moveTo(
            Math.random() * captchaCanvas.value.width,
            Math.random() * captchaCanvas.value.height
        )
        ctx.lineTo(
            Math.random() * captchaCanvas.value.width,
            Math.random() * captchaCanvas.value.height
        )
        ctx.stroke()
      }

      // 绘制验证码文本
      for (let i = 0; i < text.length; i++) {
        ctx.fillStyle = getRandomColor()
        ctx.font = 'bold 20px Arial'
        ctx.fillText(
            text[i],
            20 + i * 25,
            30,
            25
        )
      }
    }

    // 生成随机颜色
    const getRandomColor = () => {
      const r = Math.floor(Math.random() * 128) + 64
      const g = Math.floor(Math.random() * 128) + 64
      const b = Math.floor(Math.random() * 128) + 64
      return `rgb(${r}, ${g}, ${b})`
    }

    // 刷新验证码
    const refreshCaptcha = () => {
      drawCaptcha()
      loginForm.captcha = ''
    }

    // 登录方法
    const handleLogin = () => {
      // 表单验证
      loginFormRef.value.validate(valid => {
        if (valid) {
          loading.value = true
          // 这里执行登录API调用
          console.log('登录信息:', {
            username: loginForm.username,
            password: loginForm.password,
            remember: rememberMe.value
          })
          setTimeout(() => {
            loading.value = false
            ElMessage.success('登录成功')
          }, 1000)
        }
      })
    }

    const goToRegister = () => {
      router.push('/register')
    }

    onMounted(() => {
      drawCaptcha()
    })

    return {
      loginForm,
      loginRules,
      loading,
      rememberMe,
      showCaptcha,
      captchaCanvas,
      goToRegister,
      handleLogin,
      refreshCaptcha,
      User, Lock, Key
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: url('@/assets/login-bg.jpg') no-repeat center center;
  background-size: cover;
}

.login-box {
  width: 420px;
  padding: 40px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.logo-area {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 10px;
}

.system-name {
  font-size: 22px;
  color: #333;
  margin: 0;
}

.login-form {
  margin-top: 20px;
}

.captcha-container {
  display: flex;
  align-items: center;
}

.captcha-input {
  flex: 1;
  margin-right: 10px;
}

.captcha-img {
  width: 120px;
  height: 40px;
  cursor: pointer;
  border-radius: 4px;
}

.forget-pwd {
  float: right;
}

.login-btn {
  width: 100%;
  height: 45px;
  font-size: 16px;
  letter-spacing: 2px;
}

.footer {
  margin-top: 30px;
  text-align: center;
  font-size: 12px;
  color: #999;
}

.footer p {
  margin: 5px 0;
}

.remember-forget-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.forget-pwd {
  margin-left: auto; /* 使忘记密码链接靠右 */
}

.captcha-canvas {
  border-radius: 4px;
}

.captcha-image-wrapper {
  position: relative;
  width: 120px;
  height: 40px;
  cursor: pointer;
}

.captcha-refresh {
  position: absolute;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 2px 4px;
  border-radius: 4px 0 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-refresh:hover {
  background: rgba(0, 0, 0, 0.7);
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: #606266;
  font-size: 14px;
}
</style>