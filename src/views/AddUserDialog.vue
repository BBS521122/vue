<template>
  <el-dialog v-model="visible" title="添加用户" width="600px">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="用户昵称" prop="nickname" required>
            <el-input v-model="form.nickname" placeholder="请输入用户昵称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="用户名" prop="username" required>
            <el-input v-model="form.username" placeholder="请输入用户名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入手机号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="用户密码" prop="password">
            <el-input
                v-model="form.password"
                type="password"
                show-password
                placeholder="请输入密码"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="归属部门" prop="department">
            <el-select v-model="form.department" placeholder="请选择部门">
              <el-option label="研发部" value="研发部" />
              <el-option label="测试部" value="测试部" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio label="正常" />
              <el-radio label="停用" />
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="岗位" prop="position">
            <el-select v-model="form.position" placeholder="请选择">
              <el-option label="前端" value="前端" />
              <el-option label="后端" value="后端" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="角色" prop="role">
            <el-select v-model="form.role" placeholder="请选择">
              <el-option label="管理员" value="admin" />
              <el-option label="用户" value="user" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <!-- 底部按钮 -->
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const visible = ref(false)
const formRef = ref()

const form = ref({
  nickname: '',
  username: '',
  phone: '',
  password: '',
  department: '',
  email: '',
  status: '正常',
  position: '',
  role: '',
  remark: ''
})

const rules = {
  nickname: [{ required: true, message: '请输入用户昵称', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

// ✅ 暴露方法给外部打开弹窗
const open = () => {
  visible.value = true
}

// ✅ 提交表单，调用后端接口
const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // ✅ 与后端交互的部分（你可以替换为 axios 调用接口）
        // await axios.post('/api/users', form.value)

        console.log('提交的表单数据：', form.value)

        ElMessage.success('添加用户成功')
        visible.value = false
      } catch (e) {
        ElMessage.error('添加用户失败')
      }
    }
  })
}

defineExpose({ open }) // 允许父组件调用 open()
</script>
