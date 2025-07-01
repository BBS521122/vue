import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/meeting/creator/1',
    },
    {
      path: '/meeting/:role(user|creator)/:id',
      name: 'MeetingRole',
      component: () => import('../components/MeetingRoom.vue'),
      props: true
    }
  ],
})

export default router
