<template>
  <div class="meeting-container">
    <!-- 视频区域 -->
    <div class="video-area">
      <div v-if="mainVideoStream" class="main-video">
        <video
            ref="mainVideoRef"
            :srcObject="mainVideoStream"
            autoplay
            muted
            class="main-video-element"
        ></video>
      </div>
      <div v-else class="no-video">
        暂无视频流信息
      </div>
    </div>
    <!-- 辅助视频 -->
    <div v-if="secondaryVideoStream" class="secondary-video">
      <video
          ref="secondaryVideoRef"
          :srcObject="secondaryVideoStream"
          autoplay
          muted
          class="secondary-video-element"
          @click="switchMainVideo"
      ></video>
      <div class="switch-button" @click="switchMainVideo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7z"/>
          <path d="M17 17H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
        </svg>
      </div>
    </div>

    <!-- 弹幕区域 -->
    <div class="chat-area">
      <div class="chat-header">
        <h3>聊天</h3>
        <button
            v-if="isCreator"
            @click="toggleMuteAll"
            :class="['mute-button', { active: isMuteAll }]"
        >
          {{ isMuteAll ? '解除禁言' : '全体禁言' }}
        </button>
      </div>

      <div class="chat-messages" ref="chatMessagesRef">
        <div
            v-for="message in messages"
            :key="message.id"
            :class="['message', { creator: message.isCreator }]"
        >
          <div class="message-header">
            <span class="message-author">
              {{ message.isCreator ? '主持人' : `用户${message.peerId.slice(-4)}` }}
            </span>
            <span class="message-time">
              {{ formatTime(message.timestamp) }}
            </span>
          </div>
          <div class="message-content">{{ message.content }}</div>
        </div>
      </div>

      <div class="chat-input" v-if="!isMuteAll || isCreator">
        <input
            v-model="newMessage"
            @keyup.enter="sendMessage"
            placeholder="输入消息..."
            :disabled="isSending"
        />
        <button @click="sendMessage" :disabled="!newMessage.trim() || isSending">
          发送
        </button>
      </div>
      <div v-else class="mute-notice">
        您已被禁言
      </div>
    </div>

    <!-- 控制栏 -->
    <div class="control-bar">
      <div class="control-group">
        <!-- 摄像头控制 -->
        <button
            v-if="isCreator"
            @click="toggleCamera"
            :class="['control-button', { active: isCameraOn }]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path v-if="isCameraOn" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            <path v-else d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82l-2-2H16c.55 0 1 .45 1 1v3.5l4-4v11l-1.43-1.43L21 6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
          </svg>
          {{ isCameraOn ? '关闭摄像头' : '开启摄像头' }}
        </button>

        <!-- 屏幕共享控制 -->
        <button
            v-if="isCreator"
            @click="toggleScreenShare"
            :class="['control-button', { active: isScreenSharing }]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
          </svg>
          {{ isScreenSharing ? '停止共享' : '共享屏幕' }}
        </button>

        <!-- 录制控制（仅创建者） -->
        <button
            v-if="isCreator"
            @click="toggleRecording"
            :class="['control-button', 'recording', { active: isRecording }]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8"/>
          </svg>
          {{ isRecording ? '停止录制' : '开始录制' }}
        </button>
      </div>

      <div class="control-group">
        <!-- 离开会议 -->
        <button @click="leaveMeeting" class="control-button leave">
          离开会议
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import MediaSoupClientService from '../MediaSoupClient.js';

export default {
  name: 'MeetingRoom',
  props: {
    id: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    serverUrl: {
      type: String,
      default: 'http://localhost:3001'
    }
  },
  emits: ['leave'],
  setup(props, { emit }) {
    // 响应式数据
    const mainVideoRef = ref(null);
    const secondaryVideoRef = ref();
    const chatMessagesRef = ref();
    const isCreator = ref(false);

    const mainVideoStream = ref(null);
    const secondaryVideoStream = ref(null);
    const isCameraOn = ref(false);
    const isScreenSharing = ref(false);
    const isRecording = ref(false);
    const isMuteAll = ref(false);
    const isSending = ref(false);

    const messages = reactive([]);
    const newMessage = ref('');
    const meetingTitle = ref('视频会议');

    // MediaSoup客户端
    let mediaSoupClient;
    let cameraStream = null;
    let screenStream = null;

    // 初始化
    onMounted(async () => {
      try {
        await initMeeting();
      } catch (error) {
        console.error('初始化会议失败:', error);
        alert('连接会议失败，请检查网络连接');
      }
    });

    // 清理
    onUnmounted(() => {
      cleanup();
    });

    // 初始化会议，在生命周期钩子中调用
    async function initMeeting() {
      mediaSoupClient = new MediaSoupClientService();

      // 设置事件监听器
      mediaSoupClient.setEventListeners({
        onNewConsumer: handleNewConsumer,
        onConsumerClosed: handleConsumerClosed,
        onNewMessage: handleNewMessage,
        onUserJoined: handleUserJoined,
        onUserLeft: handleUserLeft,
        onRecordingStarted: handleRecordingStarted,
        onRecordingStopped: handleRecordingStopped,
        onMuteStatusChanged: handleMuteStatusChanged,
        onMainVideoChanged: handleMainVideoChanged
      });

      isCreator.value= props.role === 'creator';
      // 连接到会议
      const config = {
        roomId: props.id,
        isCreator: isCreator.value,
        serverUrl: props.serverUrl
      };
      // TODO 根据id获取会议信息
      console.log("会议ID:", config.roomId);
      await mediaSoupClient.connect(config);
      await mediaSoupClient.handleCreatorVideo();

      // 如果是创建者，自动开启摄像头
      if (isCreator.value) {
        await toggleCamera();
      }
    }

    // 处理新消费者
    function handleNewConsumer(consumer, peerId) {
      console.log('=== 处理新消费者 ===');
      console.log('消费者信息:', {
        id: consumer.id,
        kind: consumer.kind,
        appData: consumer.appData,
        track: !!consumer.track,
        trackId: consumer.track?.id,
        trackEnabled: consumer.track?.enabled,
        trackReadyState: consumer.track?.readyState
      });
      console.log('来自用户:', peerId);
      
      const stream = new MediaStream([consumer.track]);
      console.log('创建的视频流:', {
        id: stream.id,
        active: stream.active,
        trackCount: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });

      console.log('当前主视频流状态:', {
        hasMainVideo: !!mainVideoStream.value,
        mainVideoId: mainVideoStream.value?.id
      });

      // 兼容 creator-video 类型
      if (consumer.appData?.type === 'camera' || consumer.appData?.type === 'creator-video') {
        console.log('🎥 识别为摄像头或创建者视频流');
        if (!mainVideoStream.value) {
          console.log('📺 设置为主视频流');
          mainVideoStream.value = stream;
          console.log('✅ 主视频流已设置:', {
            streamId: stream.id,
            active: stream.active
          });
        } else {
          console.log('📹 设置为辅助视频流');
          secondaryVideoStream.value = stream;
          console.log('✅ 辅助视频流已设置:', {
            streamId: stream.id,
            active: stream.active
          });
        }
      } else if (consumer.appData?.type === 'screen') {
        console.log('🖥️ 识别为屏幕共享流');
        // 屏幕共享优先显示在主视频
        if (mainVideoStream.value && mainVideoStream.value !== stream) {
          console.log('📹 原主视频流移至辅助位置');
          secondaryVideoStream.value = mainVideoStream.value;
        }
        console.log('📺 屏幕共享设为主视频流');
        mainVideoStream.value = stream;
        console.log('✅ 屏幕共享主视频流已设置:', {
          streamId: stream.id,
          active: stream.active
        });
      } else {
        console.warn('⚠️ 未知的流类型:', consumer.appData?.type);
      }

      console.log('=== 处理完成后的状态 ===');
      console.log('主视频流:', {
        exists: !!mainVideoStream.value,
        id: mainVideoStream.value?.id,
        active: mainVideoStream.value?.active,
        trackCount: mainVideoStream.value?.getTracks().length
      });
      console.log('辅助视频流:', {
        exists: !!secondaryVideoStream.value,
        id: secondaryVideoStream.value?.id,
        active: secondaryVideoStream.value?.active,
        trackCount: secondaryVideoStream.value?.getTracks().length
      });
    }

    // 处理消费者关闭
    function handleConsumerClosed(consumerId) {
      console.log('消费者关闭:', consumerId);
    }

    // 处理新消息
    function handleNewMessage(message) {
      messages.push(message);
      nextTick(() => {
        if (chatMessagesRef.value) {
          chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
        }
      });
    }

    // 处理用户加入
    function handleUserJoined(peerId, isCreator) {
      console.log('用户加入:', peerId, isCreator);
    }

    // 处理用户离开
    function handleUserLeft(peerId) {
      console.log('用户离开:', peerId);
    }

    // 处理录制开始
    function handleRecordingStarted(data) {
      isRecording.value = true;
      console.log('录制开始:', data);
    }

    // 处理录制停止
    function handleRecordingStopped(data) {
      isRecording.value = false;
      console.log('录制停止:', data);
    }

    // 处理禁言状态变化
    function handleMuteStatusChanged(muteAll) {
      isMuteAll.value = muteAll;
    }

    // 处理主视频变化
    function handleMainVideoChanged(producerId) {
      console.log('主视频变化:', producerId);
    }

    // 切换摄像头
    async function toggleCamera() {
      try {
        if (isCameraOn.value) {
          // 关闭摄像头
          if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
          }
          isCameraOn.value = false;

          // 如果主视频是摄像头，切换到辅助视频
          if (mainVideoStream.value === cameraStream) {
            mainVideoStream.value = secondaryVideoStream.value;
            secondaryVideoStream.value = null;
          }
        } else {
          // 开启摄像头
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });

          // 生产视频流
          const videoTrack = cameraStream.getVideoTracks()[0];
          const audioTrack = cameraStream.getAudioTracks()[0];

          if (videoTrack) {
            await mediaSoupClient.produce(videoTrack, { type: 'camera' });
          }
          if (audioTrack) {
            await mediaSoupClient.produce(audioTrack, { type: 'audio' });
          }

          // 设置本地视频流
          if (!mainVideoStream.value) {
            mainVideoStream.value = cameraStream;
          } else {
            secondaryVideoStream.value = cameraStream;
          }

          isCameraOn.value = true;
        }
      } catch (error) {
        console.error('切换摄像头失败:', error);
        alert('摄像头操作失败');
      }
    }

    // 切换屏幕共享
    async function toggleScreenShare() {
      try {
        if (isScreenSharing.value) {
          // 停止屏幕共享
          if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            screenStream = null;
          }
          isScreenSharing.value = false;

          // 恢复摄像头为主视频
          if (cameraStream) {
            mainVideoStream.value = cameraStream;
            secondaryVideoStream.value = null;
          }
        } else {
          // 开始屏幕共享
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });

          // 生产屏幕流
          const videoTrack = screenStream.getVideoTracks()[0];
          const audioTrack = screenStream.getAudioTracks()[0];

          if (videoTrack) {
            await mediaSoupClient.produce(videoTrack, { type: 'screen' });
          }
          if (audioTrack) {
            await mediaSoupClient.produce(audioTrack, { type: 'screen-audio' });
          }

          // 设置屏幕共享为主视频
          if (mainVideoStream.value) {
            secondaryVideoStream.value = mainVideoStream.value;
          }
          mainVideoStream.value = screenStream;

          isScreenSharing.value = true;

          // 监听屏幕共享结束
          videoTrack.onended = () => {
            toggleScreenShare();
          };
        }
      } catch (error) {
        console.error('屏幕共享操作失败:', error);
        alert('屏幕共享操作失败');
      }
    }

    // 切换主辅视频
    function switchMainVideo() {
      if (secondaryVideoStream.value) {
        const temp = mainVideoStream.value;
        mainVideoStream.value = secondaryVideoStream.value;
        secondaryVideoStream.value = temp;
      }
    }

    // 发送消息
    function sendMessage() {
      if (!newMessage.value.trim() || isSending.value) return;

      isSending.value = true;
      mediaSoupClient.sendMessage(newMessage.value.trim());
      newMessage.value = '';

      setTimeout(() => {
        isSending.value = false;
      }, 500);
    }

    // 切换全体禁言
    function toggleMuteAll() {
      if (!isCreator.value) return;
      mediaSoupClient.muteAll(!isMuteAll.value);
    }

    // 切换录制
    function toggleRecording() {
      if (!isCreator.value) return;

      if (isRecording.value) {
        mediaSoupClient.stopRecording();
      } else {
        mediaSoupClient.startRecording();
      }
    }

    // 离开会议
    function leaveMeeting() {
      cleanup();
      emit('leave');
    }

    // 清理资源
    function cleanup() {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      if (mediaSoupClient) {
        mediaSoupClient.disconnect();
      }
    }

    // 格式化时间
    function formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return {
      mainVideoRef,
      secondaryVideoRef,
      chatMessagesRef,
      mainVideoStream,
      secondaryVideoStream,
      isCameraOn,
      isScreenSharing,
      isRecording,
      isMuteAll,
      isSending,
      messages,
      newMessage,
      meetingTitle,
      toggleCamera,
      toggleScreenShare,
      switchMainVideo,
      sendMessage,
      toggleMuteAll,
      toggleRecording,
      leaveMeeting,
      formatTime,
      isCreator
    };
  }
};
</script>

<style scoped>
.meeting-container {
  display: flex;
  height: 100vh;
  background: #1a1a1a;
  color: white;
}

.video-area {
  flex: 1;
  position: relative;
  background: #000;
}

.main-video {
  width: 100%;
  height: 100%;
  position: relative;
}

.main-video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
  padding: 20px;
}

.video-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recording-indicator {
  color: #ff4444;
  font-weight: bold;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.meeting-title {
  font-size: 18px;
  font-weight: bold;
}

.secondary-video {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 300px;
  height: 200px;
  border: 2px solid #333;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.secondary-video:hover {
  transform: scale(1.05);
}

.secondary-video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.switch-button {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.7);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.switch-button:hover {
  background: rgba(0,0,0,0.9);
}

.chat-area {
  width: 350px;
  background: #2a2a2a;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #444;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #444;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
  margin: 0;
  font-size: 18px;
}

.mute-button {
  background: #666;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.mute-button:hover {
  background: #777;
}

.mute-button.active {
  background: #ff4444;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  margin-bottom: 16px;
  padding: 12px;
  background: #333;
  border-radius: 8px;
}

.message.creator {
  background: #4a4a4a;
  border-left: 4px solid #007bff;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #ccc;
}

.message-author {
  font-weight: bold;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #444;
  display: flex;
  gap: 10px;
}

.chat-input input {
  flex: 1;
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
}

.chat-input input:focus {
  outline: none;
  border-color: #007bff;
}

.chat-input button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.chat-input button:hover:not(:disabled) {
  background: #0056b3;
}

.chat-input button:disabled {
  background: #666;
  cursor: not-allowed;
}

.mute-notice {
  padding: 20px;
  text-align: center;
  color: #999;
  border-top: 1px solid #444;
}

.control-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 350px;
  background: rgba(0,0,0,0.8);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-group {
  display: flex;
  gap: 12px;
}

.control-button {
  background: #333;
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.control-button:hover {
  background: #444;
}

.control-button.active {
  background: #007bff;
}

.control-button.recording.active {
  background: #ff4444;
}

.control-button.leave {
  background: #dc3545;
}

.control-button.leave:hover {
  background: #c82333;
}

.meeting-info {
  padding: 20px;
  background: #2a2a2a;
  color: white;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-bottom: 1px solid #444;
}

.meeting-details {
  text-align: right;
}

.meeting-title {
  margin: 0;
  font-size: 24px;
}

.meeting-times span {
  display: block;
  font-size: 16px;
  margin-top: 5px;
}
/* 响应式设计 */
@media (max-width: 768px) {
  .meeting-container {
    flex-direction: column;
  }

  .chat-area {
    width: 100%;
    height: 300px;
  }

  .control-bar {
    right: 0;
  }

  .secondary-video {
    width: 150px;
    height: 100px;
    top: 10px;
    right: 10px;
  }
}
.main-video-element {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 根据屏幕比例缩放视频 */
}
</style>

