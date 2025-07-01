import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'


// @ts-ignore
import App from './App.vue'
import router from './router'
import axios from "axios";

const app = createApp(App)
axios.defaults.baseURL = 'http://localhost:8080/';

app.config.globalProperties.$axios = axios;
axios.interceptors.request.use(
    config => {
        // 在发送请求之前做些什么
        config.headers.Authorization = localStorage.getItem("token")
        return config
    },
    error => {
        // 对请求错误做些什么
        return Promise.reject(error)
    }
)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
