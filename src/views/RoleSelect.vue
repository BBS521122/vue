<template>
  <div class="role-select">
    <h1>请选择您的身份</h1>
    <div class="buttons">
      <button @click="selectRole('user')">企业用户</button>
      <button @click="selectRole('admin')">超级管理员</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const selectRole = (role) => {
  sessionStorage.setItem('userRole', role);

  if (role === 'user') {
    router.push({ name: 'CourseList' });
  } else {
    router.push({ name: 'AuditList' }); // 跳转到审核列表
  }
};
</script>